import type { NormalizedProblem } from '../../walk.js';
import { displaySide, type DiffResult } from '../types.js';

// Lint's problem model describes defects carrying a severity, so only breaking
// changes map onto it — the complete change list stays in the `json` format.
// This is what lets the diff report reuse the lint formatters in core.
export function breakingChangesToProblems(result: DiffResult): NormalizedProblem[] {
  return result.changes
    .filter((change) => change.compat === 'breaking')
    .map((change) => {
      // verdicts are worst-first, so the first one carries the breaking verdict.
      const [verdict] = change.verdicts;
      return {
        message: verdict?.message ?? `${change.kind} ${change.key}`,
        ruleId: verdict?.ruleId ?? 'diff',
        severity: 'error' as const,
        location: [displaySide(change).location],
        // Point at the counterpart in the base document, so formats that render
        // a `from` location show both sides of the change.
        ...(change.kind === 'modified' ? { from: change.base.location } : {}),
        suggest: [],
      };
    });
}
