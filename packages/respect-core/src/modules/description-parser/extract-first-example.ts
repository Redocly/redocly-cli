import { isPlainObject, type Oas3Example } from '@redocly/openapi-core';

export function extractFirstExample(examples: Record<string, Oas3Example> | undefined) {
  if (isPlainObject(examples)) {
    const firstKey = Object.keys(examples)[0];
    return firstKey ? examples[firstKey]?.value : undefined;
  } else {
    return undefined;
  }
}
