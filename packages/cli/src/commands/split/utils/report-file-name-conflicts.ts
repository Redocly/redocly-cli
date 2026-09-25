import {
  HandledError,
  formatProblems,
  getTotals,
  type NormalizedProblem,
  type RuleSeverity,
  type Source,
} from '@redocly/openapi-core';

import type { FileNameConflict } from './get-file-name-path.js';

export function reportFileNameConflicts(
  conflicts: FileNameConflict[],
  source: Source,
  severity: RuleSeverity = 'warn'
) {
  if (severity === 'off' || conflicts.length === 0) return;

  const problems: NormalizedProblem[] = conflicts.map(
    ({ name, collidingName, filename, pointer }) => ({
      ruleId: 'split',
      severity,
      message:
        severity === 'error'
          ? `${name} and ${collidingName} would share one file on a case-insensitive file system.`
          : `${name} and ${collidingName} would share one file on a case-insensitive file system, saving ${name} to ${filename}.`,
      location: [{ source, pointer, reportOnKey: true }],
      suggest: [],
    })
  );
  formatProblems(problems, { totals: getTotals(problems), command: 'split' });

  if (severity === 'error') {
    throw new HandledError('❌ Errors encountered while splitting: files not created.');
  }
}
