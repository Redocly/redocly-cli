import {
  logger,
  type OASStatsAccumulator,
  type AsyncAPIStatsAccumulator,
} from '@redocly/openapi-core';

export function printStatsJson(statsAccumulator: OASStatsAccumulator | AsyncAPIStatsAccumulator) {
  const json = Object.fromEntries(
    Object.entries(statsAccumulator).map(([key, { metric, total, counts }]) => [
      key,
      { metric, total, counts },
    ])
  );

  logger.output(JSON.stringify(json, null, 2));
}
