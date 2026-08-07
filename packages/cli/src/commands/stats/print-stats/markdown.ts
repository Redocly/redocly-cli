import {
  logger,
  type OASStatsAccumulator,
  type AsyncAPIStatsAccumulator,
} from '@redocly/openapi-core';

export function printStatsMarkdown(
  statsAccumulator: OASStatsAccumulator | AsyncAPIStatsAccumulator
) {
  let output = '| Feature  | Count  |\n| --- | --- |\n';
  const breakdowns: string[] = [];
  for (const key of Object.keys(statsAccumulator)) {
    const stat = statsAccumulator[key as keyof typeof statsAccumulator];
    output += '| ' + stat.metric + ' | ' + stat.total + ' |\n';
    const details = Object.entries(stat.details || {});
    if (details.length) {
      breakdowns.push(
        `\n#### ${stat.metric}\n| Extension | Count |\n| --- | --- |\n` +
          details.map(([name, { count }]) => `| ${name} | ${count} |`).join('\n') +
          '\n'
      );
    }
  }

  logger.output(output + breakdowns.join(''));
}
