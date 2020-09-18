export function isObject(obj: any) {
  const type = typeof obj;
  return type === 'function' || type === 'object' && !!obj;
}

export function isNotObjectKeys(obj: any) {
  return Object.keys(obj).length === 0;
}

export function isString(str: string) {
  return Object.prototype.toString.call(str) === "[object String]";
}
