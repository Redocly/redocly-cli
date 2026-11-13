import { DEFAULT_SCORING_CONSTANTS } from './constants.js';
import type {
  DocumentMetrics,
  HotspotOperation,
  HotspotReason,
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
      reasons: reasons.map(({ reason, detail }) => (detail ? `${reason} (${detail})` : reason)),
    });
  }

  entries.sort((a, b) => {
    if (a.reasons.length !== b.reasons.length) return b.reasons.length - a.reasons.length;
    return a.agentReadinessScore - b.agentReadinessScore;
  });

  return entries.slice(0, constants.hotspotLimit);
}

export function getHotspotReasons(
  metrics: OperationMetrics,
  dependencyDepth: number,
  constants: ScoringConstants = DEFAULT_SCORING_CONSTANTS
): HotspotReason[] {
  const { thresholds } = constants;
  const reasons: HotspotReason[] = [];

  if (metrics.parameterCount > thresholds.maxParamsGood) {
    reasons.push({
      subscore: 'parameterSimplicity',
      reason: 'High parameter count',
      detail: `${metrics.parameterCount}`,
    });
  }

  const maxDepth = Math.max(metrics.maxRequestSchemaDepth, metrics.maxResponseSchemaDepth);
  if (maxDepth > thresholds.maxDepthGood) {
    reasons.push({
      subscore: 'schemaSimplicity',
      reason: 'Deep schema nesting',
      detail: `depth ${maxDepth}`,
    });
  }

  if (metrics.anyOfCount > 0 && !metrics.hasDiscriminator) {
    reasons.push({
      subscore: 'polymorphismClarity',
      reason: 'Polymorphism (anyOf) without discriminator',
      detail: `${metrics.anyOfCount} anyOf`,
    });
  } else if (metrics.polymorphismCount > thresholds.maxPolymorphismGood) {
    reasons.push({
      subscore: 'polymorphismClarity',
      reason: 'High polymorphism count',
      detail: `${metrics.polymorphismCount}`,
    });
  }

  const missingReqExample = metrics.requestBodyPresent && !metrics.requestExamplePresent;
  const missingResExample = metrics.responseBodyPresent && !metrics.responseExamplePresent;

  if (missingReqExample && missingResExample) {
    reasons.push({ subscore: 'exampleCoverage', reason: 'Missing request and response examples' });
  } else if (missingReqExample) {
    reasons.push({ subscore: 'exampleCoverage', reason: 'Missing request body examples' });
  } else if (missingResExample) {
    reasons.push({ subscore: 'exampleCoverage', reason: 'Missing response examples' });
  }

  if (metrics.totalErrorResponses > 0 && metrics.structuredErrorResponseCount === 0) {
    reasons.push({ subscore: 'errorClarity', reason: 'No structured error responses (4xx/5xx)' });
  }

  if (!metrics.operationDescriptionPresent) {
    reasons.push({ subscore: 'documentationQuality', reason: 'Missing operation description' });
  }

  if (metrics.parameterCount > 0 && metrics.paramsWithDescription === 0) {
    reasons.push({ subscore: 'documentationQuality', reason: 'No parameter descriptions' });
  }

  if (dependencyDepth > thresholds.maxDependencyDepthGood) {
    reasons.push({
      subscore: 'dependencyClarity',
      reason: 'High dependency depth',
      detail: `${dependencyDepth}`,
    });
  }

  if (metrics.ambiguousIdentifierCount > thresholds.maxAmbiguousGood) {
    reasons.push({
      subscore: 'identifierClarity',
      reason: 'Ambiguous identifiers',
      detail: `${metrics.ambiguousIdentifierCount}`,
    });
  }

  return reasons;
}
