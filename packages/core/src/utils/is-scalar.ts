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
