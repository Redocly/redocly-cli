import { logger, type ApiMapNode } from '@redocly/openapi-core';
import * as colors from 'colorette';

import { printApiMapJson } from './json.js';
import { printApiMapStylish } from './stylish.js';

export function printApiMap(apiMap: ApiMapNode, api: string, format: string) {
  switch (format) {
    case 'json':
      printApiMapJson(apiMap);
      break;
    default:
      logger.info(`Document: ${colors.magenta(api)} map:\n\n`);
      printApiMapStylish(apiMap);
  }
}
