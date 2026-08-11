import type { ApiAnalysis, CollectedComponent, CollectedOperation } from './build-graph.js';
import {
  buildComponentListCard,
  buildOperationListCard,
  type ComponentListCard,
  type OperationListCard,
} from './views.js';

/** Per-kind cap on returned matches; totals still count everything so the caller can say "N more". */
export const FIND_LIMIT = 20;

export type FindReport = {
  terms: string[];
  operations: OperationListCard[];
  components: ComponentListCard[];
  totalOperations: number;
  totalComponents: number;
};

/**
 * Case-insensitive substring search over the collected index. Every term must match somewhere in
 * the same entry (AND); an entry's score sums per-term field weights, so identifier hits
 * (path/operationId/name) rank above prose hits (summary/description/tags).
 */
export function findMatches(
  analysis: ApiAnalysis,
  terms: string[],
  options: { cwd: string }
): FindReport {
  const normalized = terms.map((term) => term.toLowerCase());
  // scoreAll treats an empty terms array as "every entry matches" (no term fails), so bail out early.
  if (normalized.length === 0) {
    return {
      terms: normalized,
      operations: [],
      components: [],
      totalOperations: 0,
      totalComponents: 0,
    };
  }

  const operationMatches = scoreAll(analysis.meta.operations, normalized, scoreOperation);
  const componentMatches = scoreAll(analysis.meta.components, normalized, scoreComponent);

  return {
    terms: normalized,
    operations: operationMatches
      .slice(0, FIND_LIMIT)
      .map((operation) => buildOperationListCard(analysis, operation, options.cwd)),
    components: componentMatches
      .slice(0, FIND_LIMIT)
      .map((component) => buildComponentListCard(analysis, component, options.cwd)),
    totalOperations: operationMatches.length,
    totalComponents: componentMatches.length,
  };
}

/** Keeps entries where every term scores above zero, ranked by descending summed score. */
function scoreAll<EntryType>(
  entries: EntryType[],
  terms: string[],
  scoreEntry: (entry: EntryType, term: string) => number
): EntryType[] {
  const scored: { entry: EntryType; score: number }[] = [];
  for (const entry of entries) {
    let total = 0;
    let matchesEveryTerm = true;
    for (const term of terms) {
      const termScore = scoreEntry(entry, term);
      if (termScore === 0) {
        matchesEveryTerm = false;
        break;
      }
      total += termScore;
    }
    if (matchesEveryTerm) scored.push({ entry, score: total });
  }
  // Sort is stable (V8), so document order breaks ties between equal scores.
  return scored.sort((left, right) => right.score - left.score).map((item) => item.entry);
}

/** Identifier fields weigh 2, prose fields 1, no hit 0 — per term. */
function scoreOperation(operation: CollectedOperation, term: string): number {
  if (
    operation.containerKey.toLowerCase().includes(term) ||
    (operation.operationId?.toLowerCase().includes(term) ?? false)
  ) {
    return 2;
  }
  if (
    (operation.summary?.toLowerCase().includes(term) ?? false) ||
    (operation.description?.toLowerCase().includes(term) ?? false) ||
    operation.tags.some((tag) => tag.toLowerCase().includes(term))
  ) {
    return 1;
  }
  return 0;
}

function scoreComponent(component: CollectedComponent, term: string): number {
  if (`${component.section}/${component.name}`.toLowerCase().includes(term)) return 2;
  if (component.description?.toLowerCase().includes(term) ?? false) return 1;
  return 0;
}
