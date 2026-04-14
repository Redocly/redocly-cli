import {
  logger,
  type OASStatsAccumulator,
  type AsyncAPIStatsAccumulator,
} from '@redocly/openapi-core';

export function printStatsMarkdown(
  statsAccumulator: OASStatsAccumulator | AsyncAPIStatsAccumulator
) {
  let output = '| Feature  | Count  |\n| --- | --- |\n';
  for (const key of Object.keys(statsAccumulator)) {
    const stat = statsAccumulator[key as keyof typeof statsAccumulator];
    output += '| ' + stat.metric + ' | ' + stat.total + ' |\n';
  }

  logger.output(output);
}
