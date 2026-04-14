import {
  logger,
  type OASStatsAccumulator,
  type AsyncAPIStatsAccumulator,
} from '@redocly/openapi-core';

export function printStatsJson(statsAccumulator: OASStatsAccumulator | AsyncAPIStatsAccumulator) {
  const json: any = {};
  for (const key of Object.keys(statsAccumulator)) {
    const stat = statsAccumulator[key as keyof typeof statsAccumulator];
    json[key] = {
      metric: stat.metric,
      total: stat.total,
    };
  }

  logger.output(JSON.stringify(json, null, 2));
}
