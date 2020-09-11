export function isObject(obj: any) {
  const type = typeof obj;
  return type === 'function' || type === 'object' && !!obj;
}

export function isString(str: string) {
  return Object.prototype.toString.call(str) === "[object String]";
}
