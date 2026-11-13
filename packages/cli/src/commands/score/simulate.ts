import {
  computeAllOperationScores,
  computeDiscoverability,
  computeDocumentScores,
} from './scoring.js';
import type { DocumentMetrics, OperationMetrics, RecommendationKind, Subscores } from './types.js';

type Edit = {
  subscore: keyof Subscores;
  safe: boolean;
  missing: (metrics: OperationMetrics) => number;
  fix: (metrics: OperationMetrics) => Partial<OperationMetrics>;
};

export const EDITS: Record<RecommendationKind, Edit> = {
  constraint: {
    subscore: 'constraintClarity',
    // Constraints the API does not enforce narrow its contract.
    safe: false,
    missing: (metrics) => Math.max(0, metrics.totalSchemaProperties - metrics.constraintCount),
    fix: (metrics) => ({ constraintCount: metrics.totalSchemaProperties }),
  },
  'operation-description': {
    subscore: 'documentationQuality',
    safe: true,
    missing: (metrics) => (metrics.operationDescriptionPresent ? 0 : 1),
    fix: () => ({ operationDescriptionPresent: true }),
  },
  'parameter-description': {
    subscore: 'documentationQuality',
    safe: true,
    missing: (metrics) => metrics.parameterCount - metrics.paramsWithDescription,
    // A parameter with a description no longer counts as an ambiguous identifier.
    fix: (metrics) => ({
      paramsWithDescription: metrics.parameterCount,
      ambiguousIdentifierCount: 0,
    }),
  },
  'property-description': {
    subscore: 'documentationQuality',
    safe: true,
    missing: (metrics) => metrics.totalSchemaProperties - metrics.schemaPropertiesWithDescription,
    fix: (metrics) => ({ schemaPropertiesWithDescription: metrics.totalSchemaProperties }),
  },
  'request-example': {
    subscore: 'exampleCoverage',
    safe: true,
    missing: (metrics) => (metrics.requestBodyPresent && !metrics.requestExamplePresent ? 1 : 0),
    fix: () => ({ requestExamplePresent: true }),
  },
  'response-example': {
    subscore: 'exampleCoverage',
    safe: true,
    missing: (metrics) => (metrics.responseBodyPresent && !metrics.responseExamplePresent ? 1 : 0),
    fix: () => ({ responseExamplePresent: true }),
  },
  'structured-error': {
    subscore: 'errorClarity',
    safe: true,
    missing: (metrics) => metrics.totalErrorResponses - metrics.structuredErrorResponseCount,
    fix: (metrics) => ({ structuredErrorResponseCount: metrics.totalErrorResponses }),
  },
};

export function simulateScore(
  documentMetrics: DocumentMetrics,
  dependencyDepths: Map<string, number>,
  kinds: RecommendationKind[]
): number {
  const operations = new Map<string, OperationMetrics>();

  for (const [key, metrics] of documentMetrics.operations) {
    let edited = metrics;
    for (const kind of kinds) {
      if (EDITS[kind].missing(edited) > 0) edited = { ...edited, ...EDITS[kind].fix(edited) };
    }
    operations.set(key, edited);
  }

  const operationScores = computeAllOperationScores(
    { ...documentMetrics, operations },
    dependencyDepths
  );
  return computeDocumentScores(
    operationScores,
    computeDiscoverability(documentMetrics.operationCount)
  ).agentReadiness;
}
