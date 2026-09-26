import { logger } from '@redocly/openapi-core';
import type { Problem } from '@redocly/recheck';

import { outputGitHubActionsFormat } from './github-actions.js';
import { outputJsonFormat } from './json.js';
import { prioritizeProblems } from './prioritize-problems.js';
import { outputSarifFormat } from './sarif.js';
import { outputTableFormat } from './table.js';

export interface ReportOptions {
  format: 'table' | 'json' | 'sarif' | 'github-actions';
  showStats?: boolean;
  annotationsLimit?: number;
  outputPath?: string;
  baseline?: { matched: number; new: number; stale: number };
}

export async function generateReport(
  problems: Problem[],
  fileCount: number,
  options: ReportOptions
): Promise<void> {
  const { format, showStats, annotationsLimit, outputPath, baseline } = options;
  const prioritized =
    typeof annotationsLimit === 'number'
      ? prioritizeProblems(problems, annotationsLimit)
      : problems;

  switch (format) {
    case 'sarif':
      await outputSarifFormat(prioritized, outputPath);
      break;
    case 'github-actions':
      outputGitHubActionsFormat(prioritized);
      break;
    case 'json':
      await outputJsonFormat(prioritized, fileCount, outputPath, baseline);
      break;
    default:
      outputTableFormat(problems, fileCount, showStats);
      break;
  }

  const limitInfoEnd = typeof annotationsLimit === 'number' ? ` (limit ${annotationsLimit})` : '';
  logger.info(
    `\n   Annotations prepared: ${prioritized.length}${prioritized.length > 0 ? limitInfoEnd : ''}\n`
  );
}
