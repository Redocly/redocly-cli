import { logger } from '@redocly/openapi-core';

import type { ScoreResult } from '../types.js';

export function printScoreJson(result: ScoreResult): void {
  const output = {
    agentReadiness: result.agentReadiness,
    discoverability: Math.round(result.discoverability * 100),
    subscores: result.subscores,
    rawMetrics: {
      operationCount: result.rawMetrics.operationCount,
      operations: Object.fromEntries(
        Array.from(result.rawMetrics.operations.entries()).map(([key, m]) => {
          const { refsUsed: _, ...rest } = m;
          return [key, rest];
        })
      ),
    },
    operationScores: Object.fromEntries(result.operationScores),
    dependencyDepths: Object.fromEntries(result.dependencyDepths),
    hotspots: result.hotspots,
  };

  logger.output(JSON.stringify(output, null, 2));
}
