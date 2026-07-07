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

export function scalarEquals(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => scalarEquals(item, b[i]));
  }
  return a === b;
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

// integer → number is the only widening pair among JSON Schema primitive types.
const WIDENING_PAIRS: Record<string, string[]> = { integer: ['number'] };

export function isTypeNarrowed(before: unknown, after: unknown): boolean {
  if (before === after) return false;
  if (typeof before !== 'string' || typeof after !== 'string') return true; // conservative
  return !(WIDENING_PAIRS[before] ?? []).includes(after);
}

export function isTypeWidened(before: unknown, after: unknown): boolean {
  if (before === after) return false;
  if (typeof before !== 'string' || typeof after !== 'string') return true; // conservative
  return !(WIDENING_PAIRS[after] ?? []).includes(before);
}
