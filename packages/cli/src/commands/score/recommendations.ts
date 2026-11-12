import { getHotspotReasons } from './hotspots.js';
import { round } from './scoring.js';
import { EDITS, simulateScore } from './simulate.js';
import type {
  DesignFinding,
  DocumentMetrics,
  OperationMetrics,
  OperationRef,
  Recommendation,
  RecommendationKind,
  Subscores,
} from './types.js';

// Object.keys types the keys as string.
const KINDS = Object.keys(EDITS) as RecommendationKind[];
const DESIGN_SUBSCORES: ReadonlyArray<keyof Subscores> = [
  'parameterSimplicity',
  'schemaSimplicity',
  'dependencyClarity',
  'polymorphismClarity',
];

export function getRecommendations(
  documentMetrics: DocumentMetrics,
  dependencyDepths: Map<string, number>,
  agentReadiness: number
): { reachableScore: number; recommendations: Recommendation[]; designFindings: DesignFinding[] } {
  const recommendations: Recommendation[] = [];

  for (const kind of KINDS) {
    const impact = round(simulateScore(documentMetrics, dependencyDepths, [kind]) - agentReadiness);
    if (impact <= 0) continue;

    const { subscore, safe, missing } = EDITS[kind];
    const touched = [...documentMetrics.operations.values()].filter(
      (metrics) => missing(metrics) > 0
    );

    recommendations.push({
      kind,
      subscore,
      impact,
      count: touched.reduce((sum, metrics) => sum + missing(metrics), 0),
      operations: touched.map(toOperationRef),
      safe,
    });
  }

  recommendations.sort(
    (first, second) =>
      second.impact - first.impact ||
      second.count - first.count ||
      first.kind.localeCompare(second.kind)
  );

  return {
    reachableScore: simulateScore(
      documentMetrics,
      dependencyDepths,
      recommendations.filter(({ safe }) => safe).map(({ kind }) => kind)
    ),
    recommendations,
    designFindings: getDesignFindings(documentMetrics, dependencyDepths),
  };
}

function getDesignFindings(
  documentMetrics: DocumentMetrics,
  dependencyDepths: Map<string, number>
): DesignFinding[] {
  const findings = new Map<string, DesignFinding>();

  for (const [key, metrics] of documentMetrics.operations) {
    for (const { subscore, reason } of getHotspotReasons(metrics, dependencyDepths.get(key) ?? 0)) {
      if (!DESIGN_SUBSCORES.includes(subscore)) continue;
      const finding = findings.get(reason) ?? { subscore, reason, operations: [] };
      finding.operations.push(toOperationRef(metrics));
      findings.set(reason, finding);
    }
  }

  return [...findings.values()];
}

function toOperationRef({ method, path, operationId }: OperationMetrics): OperationRef {
  return { method, path, operationId };
}
