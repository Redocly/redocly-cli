import {
  logger,
  type OASStatsAccumulator,
  type AsyncAPIStatsAccumulator,
} from '@redocly/openapi-core';
import * as colors from 'colorette';

import { printExecutionTime } from '../../../utils/miscellaneous.js';
import { printStatsJson } from './json.js';
import { printStatsMarkdown } from './markdown.js';
import { printStatsStylish } from './stylish.js';

export function printStats(
  statsAccumulator: OASStatsAccumulator | AsyncAPIStatsAccumulator,
  api: string,
  startedAt: number,
  format: string
) {
  logger.info(`Document: ${colors.magenta(api)} stats:\n\n`);

  switch (format) {
    case 'stylish':
      printStatsStylish(statsAccumulator);
      break;
    case 'json':
      printStatsJson(statsAccumulator);
      break;
    case 'markdown':
      printStatsMarkdown(statsAccumulator);
      break;
  }

  printExecutionTime('stats', startedAt, api);
}
