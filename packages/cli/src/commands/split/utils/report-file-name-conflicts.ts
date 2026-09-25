import { HandledError, logger, type RuleSeverity } from '@redocly/openapi-core';
import { blue } from 'colorette';

import type { FileNameConflict } from './get-file-name-path.js';

export function reportFileNameConflicts(
  conflicts: FileNameConflict[],
  severity: RuleSeverity = 'warn'
) {
  if (severity === 'off' || conflicts.length === 0) return;

  for (const { name, collidingName, filename } of conflicts) {
    if (severity === 'error') {
      logger.error(
        `error: ${name} and ${collidingName} would share one file on a case-insensitive file system.\n`
      );
    } else {
      logger.warn(
        `warning: ${name} and ${collidingName} would share one file on a case-insensitive file system, saving ${name} to ${blue(
          filename
        )}.\n`
      );
    }
  }

  if (severity === 'error') {
    throw new HandledError('❌ Errors encountered while splitting: files not created.');
  }
}
