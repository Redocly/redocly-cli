import { isPlainObject } from '@redocly/openapi-core';

export function deepCopy(obj: any, visited = new WeakMap()): any {
  if (Array.isArray(obj) || isPlainObject(obj)) {
    return obj;
  }

  // Handle circular references
  if (visited.has(obj)) {
    return visited.get(obj);
  }

  if (
    obj instanceof ArrayBuffer ||
    obj instanceof File ||
    obj instanceof Blob ||
    obj instanceof FormData ||
    obj instanceof Date ||
    obj instanceof RegExp ||
    obj instanceof Map ||
    obj instanceof Set ||
    obj instanceof URL ||
    obj instanceof Error
  ) {
    return obj;
  }

  if (Array.isArray(obj)) {
    const copiedArray = [] as any[];
    visited.set(obj, copiedArray);
    for (let i = 0; i < obj.length; i++) {
      copiedArray[i] = deepCopy(obj[i], visited);
    }
    return copiedArray;
  }

  const copied = {} as any;
  visited.set(obj, copied);
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copied[key] = deepCopy(obj[key], visited);
    }
  }
  return copied;
}
