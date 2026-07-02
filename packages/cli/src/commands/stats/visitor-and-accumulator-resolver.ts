import {
  type SpecVersion,
  type OASStatsAccumulator,
  type AsyncAPIStatsAccumulator,
  StatsAsync2,
  StatsAsync3,
  StatsOAS,
} from '@redocly/openapi-core';

import { exitWithError } from '../../utils/error.js';

export function resolveStatsVisitorAndAccumulator(specVersion: SpecVersion) {
  const statsAccumulatorOAS: OASStatsAccumulator = {
    refs: { metric: '🚗 References', total: 0, color: 'red', items: new Set() },
    externalDocs: { metric: '📦 External Documents', total: 0, color: 'magenta' },
    schemas: { metric: '📈 Schemas', total: 0, color: 'white' },
    parameters: { metric: '👉 Parameters', total: 0, color: 'yellow', items: new Set() },
    links: { metric: '🔗 Links', total: 0, color: 'cyan', items: new Set() },
    pathItems: { metric: '🔀 Path Items', total: 0, color: 'green' },
    webhooks: { metric: '🎣 Webhooks', total: 0, color: 'green' },
    operations: { metric: '👷 Operations', total: 0, color: 'yellow' },
    tags: { metric: '🔖 Tags', total: 0, color: 'white', items: new Set() },
  };
  const statsAccumulatorAsync: AsyncAPIStatsAccumulator = {
    refs: { metric: '🚗 References', total: 0, color: 'red', items: new Set() },
    externalDocs: { metric: '📦 External Documents', total: 0, color: 'magenta' },
    schemas: { metric: '📈 Schemas', total: 0, color: 'white' },
    parameters: { metric: '👉 Parameters', total: 0, color: 'yellow', items: new Set() },
    channels: { metric: '📡 Channels', total: 0, color: 'green' },
    operations: { metric: '👷 Operations', total: 0, color: 'yellow' },
    tags: { metric: '🔖 Tags', total: 0, color: 'white', items: new Set() },
  };

  let statsVisitor, statsAccumulator;
  switch (specVersion) {
    case 'async2':
      statsAccumulator = statsAccumulatorAsync;
      statsVisitor = StatsAsync2(statsAccumulator);
      break;
    case 'async3':
      statsAccumulator = statsAccumulatorAsync;
      statsVisitor = StatsAsync3(statsAccumulator);
      break;
    case 'oas2':
    case 'oas3_0':
    case 'oas3_1':
    case 'oas3_2':
      statsAccumulator = statsAccumulatorOAS;
      statsVisitor = StatsOAS(statsAccumulator);
      break;
    default:
      return exitWithError(`Unsupported spec version: ${specVersion}.`);
  }

  return { statsVisitor, statsAccumulator };
}
