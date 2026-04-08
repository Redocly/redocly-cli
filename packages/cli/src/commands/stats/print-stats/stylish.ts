import {
  logger,
  type OASStatsAccumulator,
  type AsyncAPIStatsAccumulator,
} from '@redocly/openapi-core';
import * as colors from 'colorette';

export function printStatsStylish(
  statsAccumulator: OASStatsAccumulator | AsyncAPIStatsAccumulator
) {
  for (const node in statsAccumulator) {
    const stat = statsAccumulator[node as keyof typeof statsAccumulator];
    const { metric, total, color } = stat;
    const colorFn = colors[color as keyof typeof colors] as (text: string) => string;
    logger.output(colorFn(`${metric}: ${total} \n`));
  }
}
