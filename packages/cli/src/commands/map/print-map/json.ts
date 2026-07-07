import { logger, type ApiMapNode } from '@redocly/openapi-core';

export function printApiMapJson(apiMap: ApiMapNode) {
  logger.output(JSON.stringify(apiMap, null, 2));
}
