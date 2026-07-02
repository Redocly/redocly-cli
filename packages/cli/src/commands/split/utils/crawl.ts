import { isPlainObject } from '@redocly/openapi-core';

export function crawl(object: unknown, visitor: (node: Record<string, unknown>) => void) {
  if (isPlainObject(object)) {
    visitor(object);
    for (const key of Object.keys(object)) {
      crawl(object[key], visitor);
    }
  } else if (Array.isArray(object)) {
    for (const item of object) {
      crawl(item, visitor);
    }
  }
}
