import { fieldOf } from '../../node-tree/access.js';
import type { NodeEntry } from '../../node-tree/types.js';
import { dequal } from '../../utils/dequal.js';
import type { DiffRule } from '../types.js';
import { breakingDirection, describeChange, judgeConstraint, ofSchema } from './utils.js';

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

/** Above zero when the side accepts fewer values after the change, below zero when it accepts more. */
function tighteningOf(before: Bound | undefined, after: Bound | undefined, side: Side): number {
  if (!before) return 1; // a new bound
  if (!after) return -1; // a removed bound
  return compareTightness(after, before, side);
}

function describeBound(bound: Bound | undefined, side: Side): string | undefined {
  return bound && `${side.operator}${bound.exclusive ? '' : '='} ${bound.value}`;
}

export const NumericRangeChanged: DiffRule = () => ({
  Schema(change, context) {
    if (change.kind !== 'modified') return;
    if (change.property === 'multipleOf') return judgeConstraint(change, context);

    const side = [LOWER, UPPER].find(
      ({ inclusive, exclusive }) => change.property === inclusive || change.property === exclusive
    );
    if (!side) return;

    // Both keywords of a side can change together, so the side is judged once: by its inclusive
    // keyword when that one changed.
    const { base, revision } = change.node;
    const inclusiveChanged = !dequal(
      fieldOf(base, side.inclusive),
      fieldOf(revision, side.inclusive)
    );
    if (change.property === side.exclusive && inclusiveChanged) return;

    const before = boundOf(base, side);
    const after = boundOf(revision, side);
    if (!before && !after) return;
    const tightening = tighteningOf(before, after, side);
    if (tightening === 0) return;

    if (context.directions.includes(breakingDirection(tightening > 0))) {
      const subject = `${side.name}${ofSchema(change.node)}`;
      context.report({
        message: describeChange(subject, describeBound(before, side), describeBound(after, side)),
      });
    }
  },
});
