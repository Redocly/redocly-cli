import {
  displaySide,
  formatProblems,
  getTotals,
  type DiffResult,
  type Impact,
  type JudgedChange,
  type NormalizedProblem,
  type ProblemSeverity,
} from '@redocly/openapi-core';

// Only a breaking change is annotated, as an error: a GitHub warning would flag a compatible
// change as something to fix. This is what lets the format come from core's formatProblems.
const SEVERITIES: Partial<Record<Impact, ProblemSeverity>> = { major: 'error' };

export function printGithubActions(result: DiffResult): void {
  const problems: NormalizedProblem[] = result.changes.flatMap((change) => {
    // A change no rule judged is reported on its own, under the command's name.
    const verdicts: JudgedChange['verdicts'] = change.verdicts.length
      ? change.verdicts
      : [
          {
            ruleId: 'diff',
            impact: change.impact,
            message: `${change.kind} ${change.key}`,
            location: displaySide(change).location,
          },
        ];

    return verdicts.flatMap(({ ruleId, impact, message, location }) => {
      const severity = SEVERITIES[impact];
      if (!severity) return [];
      return [{ message, ruleId, severity, location: [location], suggest: [] }];
    });
  });

  formatProblems(problems, {
    format: 'github-actions',
    totals: getTotals(problems),
    maxProblems: problems.length,
  });
}
