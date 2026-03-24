import { DEFAULT_SCORING_CONSTANTS } from './constants.js';
import type {
  AgentReadinessSubscores,
  DocumentMetrics,
  IntegrationSimplicitySubscores,
  OperationMetrics,
  OperationScores,
  ScoringConstants,
} from './types.js';

export function computeOperationIntegrationSubscores(
  metrics: OperationMetrics,
  dependencyDepth: number,
  constants: ScoringConstants = DEFAULT_SCORING_CONSTANTS
): IntegrationSimplicitySubscores {
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

  const propCount = metrics.totalSchemaProperties || 1;
  const constraintClarity = clamp01(metrics.constraintCount / propCount);

  const examplePoints =
    (metrics.requestExamplePresent ? 1 : 0) + (metrics.responseExamplePresent ? 1 : 0);
  const exampleTotal = (metrics.requestBodyPresent ? 1 : 0) + 1;
  const exampleCoverage = clamp01(examplePoints / exampleTotal);

  const errorClarity =
    metrics.totalErrorResponses > 0
      ? clamp01(metrics.structuredErrorResponseCount / metrics.totalErrorResponses)
      : 1;

  const dependencyClarity = clamp01(1 - dependencyDepth / (thresholds.maxDependencyDepthGood * 2));

  return {
    parameterSimplicity,
    schemaSimplicity,
    documentationQuality,
    constraintClarity,
    exampleCoverage,
    errorClarity,
    dependencyClarity,
  };
}

export function computeOperationAgentSubscores(
  metrics: OperationMetrics,
  dependencyDepth: number,
  constants: ScoringConstants = DEFAULT_SCORING_CONSTANTS
): AgentReadinessSubscores {
  const { thresholds, weights } = constants;

  const descCount =
    (metrics.operationDescriptionPresent ? 1 : 0) +
    metrics.paramsWithDescription +
    metrics.schemaPropertiesWithDescription;
  const descTotal = 1 + metrics.parameterCount + metrics.totalSchemaProperties;
  const documentationQuality = descTotal > 0 ? clamp01(descCount / descTotal) : 1;

  const propCount = metrics.totalSchemaProperties || 1;
  const constraintClarity = clamp01(metrics.constraintCount / propCount);

  const examplePoints =
    (metrics.requestExamplePresent ? 1 : 0) + (metrics.responseExamplePresent ? 1 : 0);
  const exampleTotal = (metrics.requestBodyPresent ? 1 : 0) + 1;
  const exampleCoverage = clamp01(examplePoints / exampleTotal);

  const errorClarity =
    metrics.totalErrorResponses > 0
      ? clamp01(metrics.structuredErrorResponseCount / metrics.totalErrorResponses)
      : 1;

  const identifierClarity = clamp01(
    1 - metrics.ambiguousIdentifierCount / Math.max(thresholds.maxAmbiguousGood + 3, 1)
  );

  const dependencyClarity = clamp01(1 - dependencyDepth / (thresholds.maxDependencyDepthGood * 2));

  const polyScore = effectivePolymorphism(metrics, weights.anyOfPenaltyMultiplier);
  const polyClarity =
    polyScore === 0
      ? 1
      : metrics.hasDiscriminator
        ? clamp01(1 - polyScore / (thresholds.maxPolymorphismGood * 4))
        : clamp01(1 - polyScore / (thresholds.maxPolymorphismGood * 2));

  return {
    documentationQuality,
    constraintClarity,
    exampleCoverage,
    errorClarity,
    identifierClarity,
    dependencyClarity,
    polymorphismClarity: polyClarity,
  };
}

export function computeIntegrationSimplicity(
  subscores: IntegrationSimplicitySubscores,
  constants: ScoringConstants = DEFAULT_SCORING_CONSTANTS
): number {
  const w = constants.weights.integration;
  const raw =
    subscores.parameterSimplicity * w.parameterSimplicity +
    subscores.schemaSimplicity * w.schemaSimplicity +
    subscores.documentationQuality * w.documentationQuality +
    subscores.constraintClarity * w.constraintClarity +
    subscores.exampleCoverage * w.exampleCoverage +
    subscores.errorClarity * w.errorClarity +
    subscores.dependencyClarity * w.dependencyClarity;
  return round(clamp01(raw) * 100);
}

export function computeAgentReadiness(
  subscores: AgentReadinessSubscores,
  constants: ScoringConstants = DEFAULT_SCORING_CONSTANTS
): number {
  const w = constants.weights.agent;
  const raw =
    subscores.documentationQuality * w.documentationQuality +
    subscores.constraintClarity * w.constraintClarity +
    subscores.exampleCoverage * w.exampleCoverage +
    subscores.errorClarity * w.errorClarity +
    subscores.identifierClarity * w.identifierClarity +
    subscores.dependencyClarity * w.dependencyClarity +
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
    const integrationSubscores = computeOperationIntegrationSubscores(metrics, depth, constants);
    const agentSubscores = computeOperationAgentSubscores(metrics, depth, constants);

    result.set(key, {
      integrationSimplicity: computeIntegrationSimplicity(integrationSubscores, constants),
      agentReadiness: computeAgentReadiness(agentSubscores, constants),
      integrationSubscores,
      agentSubscores,
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
): {
  integrationSimplicity: number;
  agentReadiness: number;
} {
  if (operationScores.size === 0) {
    return { integrationSimplicity: 100, agentReadiness: 100 };
  }

  const intScores: number[] = [];
  const agentScores: number[] = [];
  for (const scores of operationScores.values()) {
    intScores.push(scores.integrationSimplicity);
    agentScores.push(scores.agentReadiness);
  }

  const w = constants.weights.discoverabilityWeight;
  const discPct = discoverability * 100;

  return {
    integrationSimplicity: round(median(intScores) * (1 - w) + discPct * w),
    agentReadiness: round(median(agentScores) * (1 - w) + discPct * w),
  };
}

function effectivePolymorphism(metrics: OperationMetrics, anyOfMultiplier: number): number {
  const otherPoly = metrics.polymorphismCount - metrics.anyOfCount;
  return otherPoly + metrics.anyOfCount * anyOfMultiplier;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function aggregateIntegrationSubscores(
  operationScores: Map<string, { integrationSubscores: IntegrationSimplicitySubscores }>
): IntegrationSimplicitySubscores {
  const n = operationScores.size || 1;
  const result: IntegrationSimplicitySubscores = {
    parameterSimplicity: 0,
    schemaSimplicity: 0,
    documentationQuality: 0,
    constraintClarity: 0,
    exampleCoverage: 0,
    errorClarity: 0,
    dependencyClarity: 0,
  };

  for (const scores of operationScores.values()) {
    result.parameterSimplicity += scores.integrationSubscores.parameterSimplicity;
    result.schemaSimplicity += scores.integrationSubscores.schemaSimplicity;
    result.documentationQuality += scores.integrationSubscores.documentationQuality;
    result.constraintClarity += scores.integrationSubscores.constraintClarity;
    result.exampleCoverage += scores.integrationSubscores.exampleCoverage;
    result.errorClarity += scores.integrationSubscores.errorClarity;
    result.dependencyClarity += scores.integrationSubscores.dependencyClarity;
  }

  result.parameterSimplicity /= n;
  result.schemaSimplicity /= n;
  result.documentationQuality /= n;
  result.constraintClarity /= n;
  result.exampleCoverage /= n;
  result.errorClarity /= n;
  result.dependencyClarity /= n;

  return result;
}

export function aggregateAgentSubscores(
  operationScores: Map<string, { agentSubscores: AgentReadinessSubscores }>
): AgentReadinessSubscores {
  const n = operationScores.size || 1;
  const result: AgentReadinessSubscores = {
    documentationQuality: 0,
    constraintClarity: 0,
    exampleCoverage: 0,
    errorClarity: 0,
    identifierClarity: 0,
    dependencyClarity: 0,
    polymorphismClarity: 0,
  };

  for (const scores of operationScores.values()) {
    result.documentationQuality += scores.agentSubscores.documentationQuality;
    result.constraintClarity += scores.agentSubscores.constraintClarity;
    result.exampleCoverage += scores.agentSubscores.exampleCoverage;
    result.errorClarity += scores.agentSubscores.errorClarity;
    result.identifierClarity += scores.agentSubscores.identifierClarity;
    result.dependencyClarity += scores.agentSubscores.dependencyClarity;
    result.polymorphismClarity += scores.agentSubscores.polymorphismClarity;
  }

  result.documentationQuality /= n;
  result.constraintClarity /= n;
  result.exampleCoverage /= n;
  result.errorClarity /= n;
  result.identifierClarity /= n;
  result.dependencyClarity /= n;
  result.polymorphismClarity /= n;

  return result;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
