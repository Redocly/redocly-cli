import {
  logger,
  type OASStatsAccumulator,
  type AsyncAPIStatsAccumulator,
} from '@redocly/openapi-core';

export function printStatsJson(statsAccumulator: OASStatsAccumulator | AsyncAPIStatsAccumulator) {
  const json: any = {};
  for (const key of Object.keys(statsAccumulator)) {
    const { metric, total, details } = statsAccumulator[key as keyof typeof statsAccumulator];
    json[key] = { metric, total };
    if (details) {
      json[key].counts = Object.fromEntries(
        Object.entries(details).map(([name, { count }]) => [name, count])
      );
    }
  }

  logger.output(JSON.stringify(json, null, 2));
}
