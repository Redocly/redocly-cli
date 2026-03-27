import { logger } from '@redocly/openapi-core';

import type { ScoreResult } from '../types.js';

export function printScoreJson(result: ScoreResult): void {
  const output = {
    integrationSimplicity: result.integrationSimplicity,
    agentReadiness: result.agentReadiness,
    discoverability: Math.round(result.discoverability * 100),
    integrationSubscores: result.integrationSubscores,
    agentSubscores: result.agentSubscores,
    rawMetrics: {
      operationCount: result.rawMetrics.operationCount,
      operations: Object.fromEntries(
        Array.from(result.rawMetrics.operations.entries()).map(([key, m]) => [
          key,
          {
            path: m.path,
            method: m.method,
            operationId: m.operationId,
            parameterCount: m.parameterCount,
            requiredParameterCount: m.requiredParameterCount,
            paramsWithDescription: m.paramsWithDescription,
            requestBodyPresent: m.requestBodyPresent,
            topLevelWritableFieldCount: m.topLevelWritableFieldCount,
            maxRequestSchemaDepth: m.maxRequestSchemaDepth,
            maxResponseSchemaDepth: m.maxResponseSchemaDepth,
            polymorphismCount: m.polymorphismCount,
            anyOfCount: m.anyOfCount,
            hasDiscriminator: m.hasDiscriminator,
            propertyCount: m.propertyCount,
            operationDescriptionPresent: m.operationDescriptionPresent,
            schemaPropertiesWithDescription: m.schemaPropertiesWithDescription,
            totalSchemaProperties: m.totalSchemaProperties,
            constraintCount: m.constraintCount,
            requestExamplePresent: m.requestExamplePresent,
            responseExamplePresent: m.responseExamplePresent,
            structuredErrorResponseCount: m.structuredErrorResponseCount,
            totalErrorResponses: m.totalErrorResponses,
            ambiguousIdentifierCount: m.ambiguousIdentifierCount,
          },
        ])
      ),
    },
    operationScores: Object.fromEntries(
      Array.from(result.operationScores.entries()).map(([key, s]) => [
        key,
        {
          integrationSimplicity: s.integrationSimplicity,
          agentReadiness: s.agentReadiness,
          integrationSubscores: s.integrationSubscores,
          agentSubscores: s.agentSubscores,
        },
      ])
    ),
    dependencyDepths: Object.fromEntries(result.dependencyDepths),
    hotspots: result.hotspots,
  };

  logger.output(JSON.stringify(output, null, 2));
}
