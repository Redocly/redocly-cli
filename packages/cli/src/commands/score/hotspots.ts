import { DEFAULT_SCORING_CONSTANTS } from './constants.js';
import type {
  DocumentMetrics,
  HotspotOperation,
  OperationMetrics,
  OperationScores,
  ScoringConstants,
} from './types.js';

export function selectTopHotspots(
  documentMetrics: DocumentMetrics,
  operationScores: Map<string, OperationScores>,
  dependencyDepths: Map<string, number>,
  constants: ScoringConstants = DEFAULT_SCORING_CONSTANTS
): HotspotOperation[] {
  const entries: HotspotOperation[] = [];

  for (const [key, scores] of operationScores) {
    const metrics = documentMetrics.operations.get(key);
    if (!metrics) continue;

    const reasons = getHotspotReasons(metrics, dependencyDepths.get(key) ?? 0, constants);
    if (reasons.length === 0) continue;

    entries.push({
      path: metrics.path,
      method: metrics.method,
      operationId: metrics.operationId,
      agentReadinessScore: scores.agentReadiness,
      reasons,
    });
  }

  entries.sort((a, b) => {
    if (a.reasons.length !== b.reasons.length) return b.reasons.length - a.reasons.length;
    return a.agentReadinessScore - b.agentReadinessScore;
  });

  return entries.slice(0, constants.hotspotLimit);
}

function getHotspotReasons(
  metrics: OperationMetrics,
  dependencyDepth: number,
  constants: ScoringConstants
): string[] {
  const { thresholds } = constants;
  const reasons: string[] = [];

  if (metrics.parameterCount > thresholds.maxParamsGood) {
    reasons.push(`High parameter count (${metrics.parameterCount})`);
  }

  const maxDepth = Math.max(metrics.maxRequestSchemaDepth, metrics.maxResponseSchemaDepth);
  if (maxDepth > thresholds.maxDepthGood) {
    reasons.push(`Deep schema nesting (depth ${maxDepth})`);
  }

  if (metrics.anyOfCount > 0 && !metrics.hasDiscriminator) {
    reasons.push(`Polymorphism (anyOf) without discriminator (${metrics.anyOfCount} anyOf)`);
  } else if (metrics.polymorphismCount > thresholds.maxPolymorphismGood) {
    reasons.push(`High polymorphism count (${metrics.polymorphismCount})`);
  }

  const missingReqExample = metrics.requestBodyPresent && !metrics.requestExamplePresent;
  const missingResExample = !metrics.responseExamplePresent;

  if (missingReqExample && missingResExample) {
    reasons.push('Missing request and response examples');
  } else if (missingReqExample) {
    reasons.push('Missing request body examples');
  } else if (missingResExample) {
    reasons.push('Missing response examples');
  }

  if (metrics.totalErrorResponses > 0 && metrics.structuredErrorResponseCount === 0) {
    reasons.push('No structured error responses (4xx/5xx)');
  }

  if (!metrics.operationDescriptionPresent) {
    reasons.push('Missing operation description');
  }

  if (metrics.parameterCount > 0 && metrics.paramsWithDescription === 0) {
    reasons.push('No parameter descriptions');
  }

  if (dependencyDepth > thresholds.maxDependencyDepthGood) {
    reasons.push(`High dependency depth (${dependencyDepth})`);
  }

  if (metrics.ambiguousIdentifierCount > thresholds.maxAmbiguousGood) {
    reasons.push(`Ambiguous identifiers (${metrics.ambiguousIdentifierCount})`);
  }

  return reasons;
}
