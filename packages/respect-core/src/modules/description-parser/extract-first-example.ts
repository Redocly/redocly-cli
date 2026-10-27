import { isPlainObject, type Oas3Example } from '@redocly/openapi-core';

export function extractFirstExample(examples: Record<string, Oas3Example> | undefined) {
  if (isPlainObject(examples)) {
    const firstKey = Object.keys(examples)[0];
    const firstExample = firstKey ? examples[firstKey] : undefined;
    return firstExample?.value ?? firstExample?.dataValue;
  } else {
    return undefined;
  }
}
