import {
  displaySide,
  type DiffResult,
  type Impact,
  type NormalizedProblem,
  type ProblemSeverity,
} from '@redocly/openapi-core';

import { byKeyAndProperty } from './order.js';

// A lint problem carries one of two severities, so a patch has nowhere to go and is left
// out; this is what lets the github-actions format come from core's formatProblems.
const SEVERITIES: Partial<Record<Impact, ProblemSeverity>> = { major: 'error', minor: 'warn' };

export function diffToProblems(result: DiffResult): NormalizedProblem[] {
  return result.changes.toSorted(byKeyAndProperty).flatMap((change) => {
    const severity = SEVERITIES[change.impact];
    if (!severity) return [];
    // Point at the counterpart in the base document, so formats that render
    // a `from` location show both sides of the change.
    const from = change.kind === 'modified' ? { from: change.base.location } : {};

    if (!change.verdicts.length) {
      return [
        {
          message: `${change.kind} ${change.key}`,
          ruleId: 'diff',
          severity,
          location: [displaySide(change).location],
          ...from,
          suggest: [],
        },
      ];
    }

    return change.verdicts.flatMap((verdict) => {
      const verdictSeverity = SEVERITIES[verdict.impact];
      if (!verdictSeverity) return [];
      return [
        {
          message: verdict.message,
          ruleId: verdict.ruleId,
          severity: verdictSeverity,
          location: [verdict.location],
          ...from,
          suggest: [],
        },
      ];
    });
  });
}
