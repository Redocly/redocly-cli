export function isPlainObject<T = Record<string, unknown>>(value: unknown): value is T {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
