import type { Problem, RuleBreakdown, Summary } from '../types/index.js';

/**
 * Generate breakdown statistics by rule
 */
export function getBreakdownStats(problems: Problem[]): RuleBreakdown {
  const breakdown: RuleBreakdown = {};

  for (const problem of problems) {
    if (!breakdown[problem.ruleName]) {
      breakdown[problem.ruleName] = { errors: 0, warnings: 0, info: 0, total: 0 };
    }

    breakdown[problem.ruleName].total++;

    switch (problem.severity) {
      case 'error':
        breakdown[problem.ruleName].errors++;
        break;
      case 'warn':
        breakdown[problem.ruleName].warnings++;
        break;
      case 'info':
        breakdown[problem.ruleName].info++;
        break;
    }
  }

  return breakdown;
}

/**
 * Build summary object from problems and file count
 */
export function buildSummary(
  problems: Problem[],
  fileCount: number,
  baseline?: Summary['baseline']
): Summary {
  const breakdown = getBreakdownStats(problems);
  const totalErrors = problems.filter((h) => h.severity === 'error').length;
  const totalWarnings = problems.filter((h) => h.severity === 'warn').length;
  const totalInfo = problems.filter((h) => h.severity === 'info').length;

  return {
    filesScanned: fileCount,
    totalIssues: problems.length,
    ...(baseline === undefined ? {} : { baseline }),
    totalErrors,
    totalWarnings,
    totalInfo,
    breakdown,
  };
}
