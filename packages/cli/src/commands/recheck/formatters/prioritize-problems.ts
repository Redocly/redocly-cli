import type { Problem } from '@redocly/recheck';

const SEVERITY_ORDER: Record<string, number> = {
  error: 2,
  warn: 1,
  info: 0,
};

// Sorts by severity (error, warn, info), then by file, line and column. Keeps at most `limit` problems.
export function prioritizeProblems(problems: Problem[], limit?: number): Problem[] {
  if (problems.length === 0) return [];

  const sorted = [...problems].sort((left, right) => {
    const leftSeverity = SEVERITY_ORDER[left.severity] ?? 0;
    const rightSeverity = SEVERITY_ORDER[right.severity] ?? 0;
    if (rightSeverity !== leftSeverity) return rightSeverity - leftSeverity;

    if (left.file !== right.file) return left.file.localeCompare(right.file);
    if (left.line !== right.line) return left.line - right.line;
    return left.column - right.column;
  });

  if (typeof limit === 'number' && limit >= 0) return sorted.slice(0, limit);
  return sorted;
}
