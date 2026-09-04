import type { Problem } from '../types/index.js';

const SEVERITY_ORDER: Record<string, number> = {
  error: 2,
  warn: 1,
  info: 0,
};

/**
 * Prioritize problems by severity (error > warn > info) and cap to a limit if provided.
 * This is intended for CI annotations (e.g., SARIF) and does not affect CLI output.
 */
export function prioritizeProblems(problems: Problem[], limit?: number): Problem[] {
  if (problems.length === 0) return [];

  const sorted = [...problems].sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] ?? 0;
    const sb = SEVERITY_ORDER[b.severity] ?? 0;
    if (sb !== sa) return sb - sa;

    // Stable-ish tiebreaker: file then line then column
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line - b.line;
    return a.column - b.column;
  });

  if (typeof limit === 'number' && limit >= 0) return sorted.slice(0, limit);
  return sorted;
}
