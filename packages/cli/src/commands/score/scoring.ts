import { DEFAULT_SCORING_CONSTANTS } from './constants.js';
import type {
  DocumentMetrics,
  OperationMetrics,
  OperationScores,
  ScoringConstants,
  Subscores,
} from './types.js';
import { median } from './utils.js';

export function computeOperationSubscores(
  metrics: OperationMetrics,
  dependencyDepth: number,
  constants: ScoringConstants = DEFAULT_SCORING_CONSTANTS
): Subscores {
  const { thresholds, weights } = constants;

  const parameterSimplicity = clamp01(1 - metrics.parameterCount / (thresholds.maxParamsGood * 2));

  const maxDepth = Math.max(metrics.maxRequestSchemaDepth, metrics.maxResponseSchemaDepth);
  const depthPenalty = maxDepth / (thresholds.maxDepthGood * 2);
  const polyPenalty =
    effectivePolymorphism(metrics, weights.anyOfPenaltyMultiplier) /
    (thresholds.maxPolymorphismGood * 3);
  const schemaSimplicity = clamp01(1 - depthPenalty - polyPenalty);

  const descCount =
    (metrics.operationDescriptionPresent ? 1 : 0) +
    metrics.paramsWithDescription +
    metrics.schemaPropertiesWithDescription;
  const descTotal = 1 + metrics.parameterCount + metrics.totalSchemaProperties;
  const documentationQuality = descTotal > 0 ? clamp01(descCount / descTotal) : 1;

  const constraintClarity =
    metrics.totalSchemaProperties > 0
      ? clamp01(metrics.constraintCount / metrics.totalSchemaProperties)
      : 1;

  const examplePoints =
    (metrics.requestExamplePresent ? 1 : 0) + (metrics.responseExamplePresent ? 1 : 0);
  const exampleTotal = (metrics.requestBodyPresent ? 1 : 0) + 1;
  const exampleCoverage = clamp01(examplePoints / exampleTotal);

  const errorClarity =
    metrics.totalErrorResponses > 0
      ? clamp01(metrics.structuredErrorResponseCount / metrics.totalErrorResponses)
      : 1;

  const dependencyClarity = clamp01(1 - dependencyDepth / (thresholds.maxDependencyDepthGood * 2));

  const identifierClarity = clamp01(
    1 - metrics.ambiguousIdentifierCount / Math.max(thresholds.maxAmbiguousGood + 3, 1)
  );

  const polyScore = effectivePolymorphism(metrics, weights.anyOfPenaltyMultiplier);
  const polymorphismClarity =
    polyScore === 0
      ? 1
      : metrics.hasDiscriminator
        ? clamp01(1 - polyScore / (thresholds.maxPolymorphismGood * 4))
        : clamp01(1 - polyScore / (thresholds.maxPolymorphismGood * 2));

  return {
    parameterSimplicity,
    schemaSimplicity,
    documentationQuality,
    constraintClarity,
    exampleCoverage,
    errorClarity,
    dependencyClarity,
    identifierClarity,
    polymorphismClarity,
  };
}

export function computeAgentReadiness(
  subscores: Subscores,
  constants: ScoringConstants = DEFAULT_SCORING_CONSTANTS
): number {
  const w = constants.weights;
  const raw =
    subscores.parameterSimplicity * w.parameterSimplicity +
    subscores.schemaSimplicity * w.schemaSimplicity +
    subscores.documentationQuality * w.documentationQuality +
    subscores.constraintClarity * w.constraintClarity +
    subscores.exampleCoverage * w.exampleCoverage +
    subscores.errorClarity * w.errorClarity +
    subscores.dependencyClarity * w.dependencyClarity +
    subscores.identifierClarity * w.identifierClarity +
    subscores.polymorphismClarity * w.polymorphismClarity;
  return round(clamp01(raw) * 100);
}

export function computeAllOperationScores(
  documentMetrics: DocumentMetrics,
  dependencyDepths: Map<string, number>,
  constants: ScoringConstants = DEFAULT_SCORING_CONSTANTS
): Map<string, OperationScores> {
  const result = new Map<string, OperationScores>();

  for (const [key, metrics] of documentMetrics.operations) {
    const depth = dependencyDepths.get(key) ?? 0;
    const subscores = computeOperationSubscores(metrics, depth, constants);

    result.set(key, {
      agentReadiness: computeAgentReadiness(subscores, constants),
      subscores,
    });
  }

  return result;
}

export function computeDiscoverability(
  operationCount: number,
  constants: ScoringConstants = DEFAULT_SCORING_CONSTANTS
): number {
  return clamp01(1 - operationCount / constants.thresholds.maxOperationsForDiscoverability);
}

export function computeDocumentScores(
  operationScores: Map<string, OperationScores>,
  discoverability: number,
  constants: ScoringConstants = DEFAULT_SCORING_CONSTANTS
): { agentReadiness: number } {
  if (operationScores.size === 0) {
    return { agentReadiness: 100 };
  }

  const scores: number[] = [];
  for (const s of operationScores.values()) {
    scores.push(s.agentReadiness);
  }

  const w = constants.weights.discoverabilityWeight;
  const discPct = discoverability * 100;

  return {
    agentReadiness: round(median(scores) * (1 - w) + discPct * w),
  };
}

function effectivePolymorphism(metrics: OperationMetrics, anyOfMultiplier: number): number {
  const otherPoly = metrics.polymorphismCount - metrics.anyOfCount;
  return otherPoly + metrics.anyOfCount * anyOfMultiplier;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function aggregateSubscores(
  operationScores: Map<string, { subscores: Subscores }>
): Subscores {
  const n = operationScores.size || 1;
  const result: Subscores = {
    parameterSimplicity: 0,
    schemaSimplicity: 0,
    documentationQuality: 0,
    constraintClarity: 0,
    exampleCoverage: 0,
    errorClarity: 0,
    dependencyClarity: 0,
    identifierClarity: 0,
    polymorphismClarity: 0,
  };

  for (const scores of operationScores.values()) {
    result.parameterSimplicity += scores.subscores.parameterSimplicity;
    result.schemaSimplicity += scores.subscores.schemaSimplicity;
    result.documentationQuality += scores.subscores.documentationQuality;
    result.constraintClarity += scores.subscores.constraintClarity;
    result.exampleCoverage += scores.subscores.exampleCoverage;
    result.errorClarity += scores.subscores.errorClarity;
    result.dependencyClarity += scores.subscores.dependencyClarity;
    result.identifierClarity += scores.subscores.identifierClarity;
    result.polymorphismClarity += scores.subscores.polymorphismClarity;
  }

  result.parameterSimplicity /= n;
  result.schemaSimplicity /= n;
  result.documentationQuality /= n;
  result.constraintClarity /= n;
  result.exampleCoverage /= n;
  result.errorClarity /= n;
  result.dependencyClarity /= n;
  result.identifierClarity /= n;
  result.polymorphismClarity /= n;

  return result;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
