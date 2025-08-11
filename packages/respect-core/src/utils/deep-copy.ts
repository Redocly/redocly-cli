import { isPlainObject } from '@redocly/openapi-core';

export function deepCopy(value: any, visited = new WeakMap()): any {
  if (!Array.isArray(value) && !isPlainObject(value)) {
    return value;
  }

  // Handle circular references
  if (visited.has(value)) {
    return visited.get(value);
  }

  if (
    value instanceof ArrayBuffer ||
    value instanceof File ||
    value instanceof Blob ||
    value instanceof FormData ||
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof Map ||
    value instanceof Set ||
    value instanceof URL ||
    value instanceof Error
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const copiedArray = [] as any[];
    visited.set(value, copiedArray);
    for (let i = 0; i < value.length; i++) {
      copiedArray[i] = deepCopy(value[i], visited);
    }
    return copiedArray;
  }

  const copied = {} as any;
  visited.set(value, copied);
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      copied[key] = deepCopy(value[key], visited);
    }
  }
  return copied;
}
