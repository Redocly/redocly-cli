export function isScalar(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

// An empty array carries no scalars to compare and is walked as a node in its own
// right, so treating it as a scalar too would report the same change twice.
export function isScalarArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(isScalar);
}

export function missingItems(before: unknown, after: unknown): unknown[] {
  if (!Array.isArray(before)) return [];
  const afterItems = Array.isArray(after) ? after : [];
  return before.filter((item) => !afterItems.includes(item));
}

export function addedItems(before: unknown, after: unknown): unknown[] {
  return missingItems(after, before);
}

export function becameTrue(before: unknown, after: unknown): boolean {
  return before !== true && after === true;
}

// `integer` accepts a subset of what `number` does, so it is the one implicit
// widening among the JSON Schema primitive types.
const WIDER_TYPE: Record<string, string> = { integer: 'number' };

/**
 * The set of types a schema accepts, folding OpenAPI 3.0's `nullable: true` into
 * the 3.1 spelling (`type: [..., 'null']`) so the two compare as equal.
 */
export function effectiveTypes(type: unknown, nullable?: unknown): Set<string> {
  const declared = Array.isArray(type) ? type : type === undefined ? [] : [type];
  const types = new Set(declared.filter((value): value is string => typeof value === 'string'));
  if (nullable === true) types.add('null');
  return types;
}

function accepts(types: Set<string>, type: string): boolean {
  const wider = WIDER_TYPE[type];
  return types.has(type) || (wider !== undefined && types.has(wider));
}

/** Some type the base accepted is no longer accepted. */
export function isTypeSetNarrowed(before: Set<string>, after: Set<string>): boolean {
  if (!before.size || !after.size) return false; // an absent `type` accepts anything
  return [...before].some((type) => !accepts(after, type));
}

/** The revision accepts some type the base did not. */
export function isTypeSetWidened(before: Set<string>, after: Set<string>): boolean {
  if (!before.size || !after.size) return false;
  return [...after].some((type) => !accepts(before, type));
}

/**
 * Which way a constraint moved. `tighter` means the schema now accepts less,
 * which breaks a request; `looser` means it accepts more, which breaks a response.
 */
export type ConstraintDirection = 'tighter' | 'looser' | 'same';

const TIGHTER_WHEN_RAISED = new Set([
  'minimum',
  'exclusiveMinimum',
  'minLength',
  'minItems',
  'minProperties',
]);
const TIGHTER_WHEN_LOWERED = new Set([
  'maximum',
  'exclusiveMaximum',
  'maxLength',
  'maxItems',
  'maxProperties',
]);
// Equivalence of these cannot be decided by comparing values, so any change to
// one is treated as a tightening rather than guessed at.
const OPAQUE = new Set(['pattern', 'format', 'multipleOf']);

export function constraintDirection(
  property: string,
  before: unknown,
  after: unknown
): ConstraintDirection {
  if (before === after) return 'same';
  if (before === undefined) return 'tighter'; // a new constraint
  if (after === undefined) return 'looser'; // one dropped

  if (property === 'additionalProperties') {
    if (before === true && after === false) return 'tighter';
    if (before === false && after === true) return 'looser';
    return 'tighter'; // swapped for a schema: narrower than an open object
  }

  if (OPAQUE.has(property)) return 'tighter';

  if (typeof before === 'number' && typeof after === 'number') {
    const raised = after > before;
    if (TIGHTER_WHEN_RAISED.has(property)) return raised ? 'tighter' : 'looser';
    if (TIGHTER_WHEN_LOWERED.has(property)) return raised ? 'looser' : 'tighter';
  }

  // `exclusiveMinimum`/`exclusiveMaximum` are booleans in OpenAPI 3.0.
  if (typeof before === 'boolean' && typeof after === 'boolean') {
    return after ? 'tighter' : 'looser';
  }

  return 'tighter';
}
