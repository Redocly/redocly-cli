import { fieldOf, keyKindOf } from '../../node-tree/access.js';
import type { NodeEntry } from '../../node-tree/types.js';
import { dequal } from '../../utils/dequal.js';
import { latestOf } from '../diff-node.js';
import type { Change, DiffRule, DiffRuleContext, DiffVisit, Direction } from '../types.js';
import { ofNamedSchema } from './utils.js';

type ModifiedChange = Extract<Change, { kind: 'modified' }>;

/** How a change moves the values a schema accepts; `unknown` where the two cannot be compared. */
type Shift = 'fewer' | 'more' | 'unknown';

const LOWER_LIMITS = new Set(['minLength', 'minItems', 'minProperties']);
const UPPER_LIMITS = new Set(['maxLength', 'maxItems', 'maxProperties']);
// Two values of these cannot be compared, so any change is taken as both fewer and more values.
const OPAQUE = new Set([
  'multipleOf',
  'pattern',
  'format',
  'const',
  'contentEncoding',
  'contentMediaType',
]);
// Flags that constrain the values only when set to this value.
const CONSTRAINING_FLAGS: Record<string, boolean> = {
  uniqueItems: true,
  additionalProperties: false,
  unevaluatedItems: false,
  unevaluatedProperties: false,
  items: false,
};
// `if` is not here: it constrains nothing on its own.
const SUBSCHEMAS = new Set([
  'not',
  'then',
  'else',
  'contains',
  'propertyNames',
  'items',
  'additionalProperties',
  'unevaluatedItems',
  'unevaluatedProperties',
  'prefixItems',
  'dependentSchemas',
  'dependentRequired',
]);

type Bound = { value: number; exclusive: boolean };

// `sign` makes a greater difference mean a tighter bound on both sides: a higher minimum and a
// lower maximum each accept fewer values.
const LOWER = {
  name: 'Lower bound',
  inclusive: 'minimum',
  exclusive: 'exclusiveMinimum',
  operator: '>',
  sign: 1,
};
const UPPER = {
  name: 'Upper bound',
  inclusive: 'maximum',
  exclusive: 'exclusiveMaximum',
  operator: '<',
  sign: -1,
};
type Side = typeof LOWER;

// Accepting fewer values breaks the clients that send them; accepting more, the ones that read
// them.
function breaks(shift: Shift, directions: Direction[]): boolean {
  return (
    (shift !== 'more' && directions.includes('request')) ||
    (shift !== 'fewer' && directions.includes('response'))
  );
}

function shiftOf(keyword: string, before: unknown, after: unknown): Shift | undefined {
  if (Object.hasOwn(CONSTRAINING_FLAGS, keyword)) {
    const wasConstrained = before === CONSTRAINING_FLAGS[keyword];
    const isConstrained = after === CONSTRAINING_FLAGS[keyword];
    if (wasConstrained === isConstrained) return undefined;
    return isConstrained ? 'fewer' : 'more';
  }
  if (!LOWER_LIMITS.has(keyword) && !UPPER_LIMITS.has(keyword) && !OPAQUE.has(keyword)) {
    return undefined;
  }
  if (before === undefined) return 'fewer';
  if (after === undefined) return 'more';
  if (typeof before !== 'number' || typeof after !== 'number' || OPAQUE.has(keyword)) {
    return 'unknown';
  }
  return LOWER_LIMITS.has(keyword) === after > before ? 'fewer' : 'more';
}

/** Above zero when `bound` accepts fewer values than `other`, below zero when it accepts more. */
function compareTightness(bound: Bound, other: Bound, side: Side): number {
  if (bound.value !== other.value) return (bound.value - other.value) * side.sign;
  return Number(bound.exclusive) - Number(other.exclusive);
}

// OpenAPI 3.0 makes `minimum` exclusive with `exclusiveMinimum: true`; OpenAPI 3.1 gives
// `exclusiveMinimum` a value of its own, and the tighter of the two keywords is the bound.
function boundOf(schema: NodeEntry | undefined, side: Side): Bound | undefined {
  const inclusive = fieldOf(schema, side.inclusive);
  const exclusive = fieldOf(schema, side.exclusive);
  if (typeof exclusive === 'number') {
    const exclusiveBound = { value: exclusive, exclusive: true };
    if (typeof inclusive !== 'number') return exclusiveBound;
    const inclusiveBound = { value: inclusive, exclusive: false };
    return compareTightness(inclusiveBound, exclusiveBound, side) > 0
      ? inclusiveBound
      : exclusiveBound;
  }
  if (typeof inclusive === 'number') return { value: inclusive, exclusive: exclusive === true };
  return undefined;
}

/** Above zero when the side accepts fewer values after the change, below zero when more. */
function tighteningOf(before: Bound | undefined, after: Bound | undefined, side: Side): number {
  if (!before) return 1;
  if (!after) return -1;
  return compareTightness(after, before, side);
}

function describeBound(bound: Bound | undefined, side: Side): string | undefined {
  return bound && `${side.operator}${bound.exclusive ? '' : '='} ${bound.value}`;
}

// A subschema constrains the values: added, the schema accepts fewer; removed, it accepts more.
const judgeSubschema: DiffVisit = (change, { report, getDirections }) => {
  const keyword = latestOf(change.node);
  const key = String(keyword.key);
  if (change.kind === 'modified' || keyKindOf(keyword) !== 'field' || !SUBSCHEMAS.has(key)) return;

  const added = change.kind === 'added';
  const parent = change.node.parent;
  const other = added ? parent?.base : parent?.revision;
  // A schema in place of `additionalProperties: false` accepts more; the flag's change reports it.
  if (Object.hasOwn(CONSTRAINING_FLAGS, key) && fieldOf(other, key) === CONSTRAINING_FLAGS[key]) {
    return;
  }
  if (!breaks(added ? 'fewer' : 'more', getDirections())) return;

  report({ message: `\`${key}\`${ofNamedSchema(parent)} was ${added ? 'added' : 'removed'}.` });
};

function judgeKeyword(change: ModifiedChange, { report, getDirections }: DiffRuleContext): void {
  const { value: before } = change.base;
  const { value: after } = change.revision;
  const shift = shiftOf(change.property, before, after);
  if (!shift || !breaks(shift, getDirections())) return;

  const subject = `\`${change.property}\`${ofNamedSchema(change.node)}`;
  if (before === undefined) report({ message: `${subject} was set to '${after}'.` });
  else if (after === undefined) report({ message: `${subject} was removed.` });
  else report({ message: `${subject} changed from '${before}' to '${after}'.` });
}

// Both keywords of a side can change together, so the side is judged once: by its inclusive
// keyword when that one changed.
function judgeBound(
  change: ModifiedChange,
  side: Side,
  { report, getDirections }: DiffRuleContext
): void {
  const { base, revision } = change.node;
  const inclusiveChanged = !dequal(
    fieldOf(base, side.inclusive),
    fieldOf(revision, side.inclusive)
  );
  if (change.property === side.exclusive && inclusiveChanged) return;

  const beforeBound = boundOf(base, side);
  const afterBound = boundOf(revision, side);
  if (!beforeBound && !afterBound) return;

  const tightening = tighteningOf(beforeBound, afterBound, side);
  if (tightening === 0 || !breaks(tightening > 0 ? 'fewer' : 'more', getDirections())) return;

  const subject = `${side.name}${ofNamedSchema(change.node)}`;
  const before = describeBound(beforeBound, side);
  const after = describeBound(afterBound, side);

  if (before === undefined) report({ message: `${subject} was set to '${after}'.` });
  else if (after === undefined) report({ message: `${subject} was removed.` });
  else report({ message: `${subject} changed from '${before}' to '${after}'.` });
}

export const SchemaConstraintChanged: DiffRule = () => ({
  Schema(change, context) {
    if (change.kind !== 'modified') return judgeSubschema(change, context);

    const side = [LOWER, UPPER].find(
      ({ inclusive, exclusive }) => change.property === inclusive || change.property === exclusive
    );
    if (side) judgeBound(change, side, context);
    else judgeKeyword(change, context);
  },
  SchemaList: judgeSubschema,
  SchemaMap: judgeSubschema,
  DependentRequired: judgeSubschema,
});
