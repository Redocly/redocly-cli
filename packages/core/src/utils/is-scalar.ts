export function isScalar(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export function isScalarArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isScalar);
}
