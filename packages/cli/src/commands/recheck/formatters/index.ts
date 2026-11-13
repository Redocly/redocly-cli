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
  const limited = typeof maxProblems === 'number';
  // The stats list tied rules in this order, so the table rows must use the same order.
  const ordered = limited ? prioritizeProblems(problems) : problems;
  const prioritized = limited && maxProblems >= 0 ? ordered.slice(0, maxProblems) : ordered;

  switch (format) {
    case 'sarif':
      outputSarifFormat(prioritized);
      break;
    case 'github-actions':
      outputGitHubActionsFormat(prioritized);
      break;
    case 'json':
      outputJsonFormat(ordered, fileCount, baseline, prioritized);
      break;
    default:
      outputTableFormat(ordered, fileCount, showStats, prioritized);
      break;
  }

  if (problems.length > prioritized.length) {
    logger.info(
      `< ... ${problems.length - prioritized.length} more problems hidden > ${gray(
        'increase with `--max-problems N`'
      )}\n`
    );
  }

  const limitInfoEnd = limited ? ` (limit ${maxProblems})` : '';
  logger.info(
    `\n   Annotations prepared: ${prioritized.length}${prioritized.length > 0 ? limitInfoEnd : ''}\n`
  );
}
