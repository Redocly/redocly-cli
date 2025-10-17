export function keysOf<T>(obj: T) {
  if (!obj) return [];
  return Object.keys(obj) as (keyof T)[];
}
