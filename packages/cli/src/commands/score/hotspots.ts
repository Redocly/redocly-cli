import { DEFAULT_SCORING_CONSTANTS } from './constants.js';
import type {
  DocumentMetrics,
  HotspotIssue,
  HotspotOperation,
  OperationMetrics,
  OperationScores,
  ScoringConstants,
} from './types.js';

function getHotspotIssues(
  metrics: OperationMetrics,
  dependencyDepth: number,
  constants: ScoringConstants
): HotspotIssue[] {
  const { thresholds } = constants;
  const issues: HotspotIssue[] = [];

  if (metrics.parameterCount > thresholds.maxParamsGood) {
    issues.push({
      code: 'high_parameter_count',
      message: `High parameter count (${metrics.parameterCount})`,
    });
  }

  const maxDepth = Math.max(metrics.maxRequestSchemaDepth, metrics.maxResponseSchemaDepth);
  if (maxDepth > thresholds.maxDepthGood) {
    issues.push({
      code: 'deep_schema_nesting',
      message: `Deep schema nesting (depth ${maxDepth})`,
    });
  }

  if (metrics.anyOfCount > 0 && !metrics.hasDiscriminator) {
    issues.push({
      code: 'any_of_without_discriminator',
      message: `Polymorphism (anyOf) without discriminator (${metrics.anyOfCount} anyOf)`,
    });
  } else if (metrics.polymorphismCount > thresholds.maxPolymorphismGood) {
    issues.push({
      code: 'high_polymorphism_count',
      message: `High polymorphism count (${metrics.polymorphismCount})`,
    });
  }

  const missingReqExample = metrics.requestBodyPresent && !metrics.requestExamplePresent;
  const missingResExample = !metrics.responseExamplePresent;

  if (missingReqExample && missingResExample) {
    issues.push({
      code: 'missing_request_and_response_examples',
      message: 'Missing request and response examples',
    });
  } else if (missingReqExample) {
    issues.push({
      code: 'missing_request_body_examples',
      message: 'Missing request body examples',
    });
  } else if (missingResExample) {
    issues.push({
      code: 'missing_response_examples',
      message: 'Missing response examples',
    });
  }

  if (metrics.totalErrorResponses > 0 && metrics.structuredErrorResponseCount === 0) {
    issues.push({
      code: 'no_structured_error_responses',
      message: 'No structured error responses (4xx/5xx)',
    });
  }

  if (!metrics.operationDescriptionPresent) {
    issues.push({
      code: 'missing_operation_description',
      message: 'Missing operation description',
    });
  }

  if (metrics.parameterCount > 0 && metrics.paramsWithDescription === 0) {
    issues.push({
      code: 'no_parameter_descriptions',
      message: 'No parameter descriptions',
    });
  }

  if (dependencyDepth > thresholds.maxDependencyDepthGood) {
    issues.push({
      code: 'high_dependency_depth',
      message: `High dependency depth (${dependencyDepth})`,
    });
  }

  if (metrics.ambiguousIdentifierCount > thresholds.maxAmbiguousGood) {
    issues.push({
      code: 'ambiguous_identifiers',
      message: `Ambiguous identifiers (${metrics.ambiguousIdentifierCount})`,
    });
  }

  return issues;
}

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

    const issues = getHotspotIssues(metrics, dependencyDepths.get(key) ?? 0, constants);
    if (issues.length === 0) continue;

    entries.push({
      path: metrics.path,
      method: metrics.method,
      operationId: metrics.operationId,
      agentReadinessScore: scores.agentReadiness,
      reasons: issues.map((i) => i.message),
      issues,
    });
  }

  entries.sort((a, b) => {
    if (a.reasons.length !== b.reasons.length) return b.reasons.length - a.reasons.length;
    return a.agentReadinessScore - b.agentReadinessScore;
  });

  return entries.slice(0, constants.hotspotLimit);
}
