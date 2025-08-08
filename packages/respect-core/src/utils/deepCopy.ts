export function deepCopy(obj: any, visited = new WeakMap()): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (visited.has(obj)) {
    return visited.get(obj);
  }

  // Handle special object types that should be returned as-is
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

  // Handle arrays
  if (Array.isArray(obj)) {
    const copiedArray = [] as any[];
    visited.set(obj, copiedArray);
    for (let i = 0; i < obj.length; i++) {
      copiedArray[i] = deepCopy(obj[i], visited);
    }
    return copiedArray;
  }

  // Handle regular objects
  const copied = {} as any;
  visited.set(obj, copied);
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copied[key] = deepCopy(obj[key], visited);
    }
  }
  return copied;
}
