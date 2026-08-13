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
  for (const { metric, total, counts } of Object.values(statsAccumulator)) {
    output += `| ${metric} | ${total} |\n`;
    const countEntries = Object.entries(counts ?? {});
    if (countEntries.length) {
      breakdowns.push(
        `\n#### ${metric}\n| Extension | Count |\n| --- | --- |\n` +
          countEntries.map(([name, count]) => `| ${name} | ${count} |`).join('\n') +
          '\n'
      );
    }
  }

  logger.output(output + breakdowns.join(''));
}
