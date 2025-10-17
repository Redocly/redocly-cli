export function isNotEmptyArray<T>(args?: T[]): args is [T, ...T[]] {
  return Array.isArray(args) && !!args.length;
}
