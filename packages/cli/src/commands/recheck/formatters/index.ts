import { logger } from '@redocly/openapi-core';
import type { Problem } from '@redocly/recheck';
import { gray } from 'colorette';

import { outputGitHubActionsFormat } from './github-actions.js';
import { outputJsonFormat } from './json.js';
import { prioritizeProblems } from './prioritize-problems.js';
import { outputSarifFormat } from './sarif.js';
import { outputTableFormat } from './table.js';

export interface ReportOptions {
  format: 'table' | 'json' | 'sarif' | 'github-actions';
  showStats?: boolean;
  maxProblems?: number;
  baseline?: { matched: number; new: number; stale: number };
}

export function generateReport(
  problems: Problem[],
  fileCount: number,
  options: ReportOptions
): void {
  const { format, showStats, maxProblems, baseline } = options;
  const prioritized =
    typeof maxProblems === 'number' ? prioritizeProblems(problems, maxProblems) : problems;

  switch (format) {
    case 'sarif':
      outputSarifFormat(prioritized);
      break;
    case 'github-actions':
      outputGitHubActionsFormat(prioritized);
      break;
    case 'json':
      outputJsonFormat(prioritized, fileCount, baseline);
      break;
    default:
      outputTableFormat(prioritized, fileCount, showStats);
      if (problems.length > prioritized.length) {
        logger.output(
          `< ... ${problems.length - prioritized.length} more problems hidden > ${gray(
            'increase with `--max-problems N`'
          )}\n`
        );
      }
      break;
  }

  const limitInfoEnd = typeof maxProblems === 'number' ? ` (limit ${maxProblems})` : '';
  logger.info(
    `\n   Annotations prepared: ${prioritized.length}${prioritized.length > 0 ? limitInfoEnd : ''}\n`
  );
}
