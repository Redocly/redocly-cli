import {
  logger,
  type OASStatsAccumulator,
  type AsyncAPIStatsAccumulator,
} from '@redocly/openapi-core';
import * as colors from 'colorette';

export function printStatsStylish(
  statsAccumulator: OASStatsAccumulator | AsyncAPIStatsAccumulator
) {
  for (const { metric, total, color, counts } of Object.values(statsAccumulator)) {
    const colorFn = colors[color];
    logger.output(colorFn(`${metric}: ${total} \n`));
    for (const [name, count] of Object.entries(counts ?? {})) {
      logger.output(colorFn(`   - ${name}: ${count} \n`));
    }
  }
}
