export function getOwn(obj: Record<string, any>, key: string) {
  return obj.hasOwnProperty(key) ? obj[key] : undefined;
}
