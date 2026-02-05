import { isPlainObject } from '@redocly/openapi-core';

export function isEmpty(value: unknown) {
  if (value === null || value === undefined) {
    return true;
  }

  if (value.constructor.name === 'FormData' || (value instanceof Blob && value.size > 0)) {
    return false;
  }

  if (isPlainObject(value)) {
    return Object.keys(value).length === 0;
  }

  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}
