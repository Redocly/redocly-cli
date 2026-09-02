export function isPlainObject<T = Record<string, unknown>>(value: unknown): value is T {
  // oxlint-disable-next-line oxlint-redocly-plugin/no-typeof-object
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
