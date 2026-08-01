import type { ApiIndex } from '@redocly/openapi-core';

export function renderIndexJson(index: ApiIndex): string {
  return JSON.stringify(index, null, 2);
}
