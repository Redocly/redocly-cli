export function isObject(obj: any) {
  const type = typeof obj;
  return type === 'function' || (type === 'object' && !!obj);
}

export function isEmptyObject(obj: any) {
  return !!obj && Object.keys(obj).length === 0;
}

export function isString(str: string) {
  return Object.prototype.toString.call(str) === '[object String]';
}

export function keysOf<T>(obj: T) {
  if (!obj) return [];
  return Object.keys(obj) as (keyof T)[];
}
