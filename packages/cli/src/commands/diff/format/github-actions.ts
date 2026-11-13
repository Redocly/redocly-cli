import {
  formatProblems,
  getTotals,
  type DiffResult,
  type Impact,
  type NormalizedProblem,
  type ProblemSeverity,
} from '@redocly/openapi-core';

// Only a breaking change is annotated, as an error: a GitHub warning would flag a compatible
// change as something to fix. This is what lets the format come from core's formatProblems.
const SEVERITIES: Partial<Record<Impact, ProblemSeverity>> = { major: 'error' };

export function printGithubActions(result: DiffResult): void {
  const problems: NormalizedProblem[] = result.changes.flatMap((change) =>
    change.verdicts.flatMap(({ ruleId, impact, message, location }) => {
      const severity = SEVERITIES[impact];
      if (!severity) return [];
      return [{ message, ruleId, severity, location: [location], suggest: [] }];
    })
  );

  formatProblems(problems, {
    format: 'github-actions',
    totals: getTotals(problems),
    maxProblems: problems.length,
  });
}
