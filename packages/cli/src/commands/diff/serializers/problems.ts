import type { NormalizedProblem, Source } from '@redocly/openapi-core';

import type { Change, DiffResult } from '../engine/types.js';
import { displaySide } from './change-side.js';

// Lint's problem model describes defects carrying a severity, so only breaking
// changes map onto it — the complete change list stays in the `json` format.
// This is what lets the diff report reuse the lint formatters in core
// (github-actions, checkstyle, codeclimate, junit, summary, codeframe).
export function breakingChangesToProblems(
  result: DiffResult,
  baseSource: Source,
  revisionSource: Source
): NormalizedProblem[] {
  return result.changes
    .filter((change) => change.compat === 'breaking')
    .map((change) => {
      const side = displaySide(change);
      const sourceOf = (changeSide: Change['base']) =>
        changeSide === change.base ? baseSource : revisionSource;

      // verdicts are worst-first, so the first one carries the breaking verdict.
      const verdict = change.verdicts?.[0];

      return {
        message: verdict?.message ?? `${change.kind} ${change.pointer}`,
        ruleId: verdict?.ruleId ?? 'diff',
        severity: 'error' as const,
        location: side ? [{ source: sourceOf(side), pointer: side.pointer }] : [],
        // Point at the counterpart in the other document, so formats that render
        // a `from` location show both sides of the change.
        ...(change.base && change.revision && side !== change.base
          ? { from: { source: baseSource, pointer: change.base.pointer } }
          : {}),
        suggest: [],
      };
    });
}
