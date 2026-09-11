import type { Logger } from '../actions/logger.js';
import type { Problem, ReportOptions } from '../types/index.js';
import { outputGitHubActionsFormat } from './formats/github-actions.js';
import { outputJsonFormat } from './formats/json.js';
import { outputSarifFormat } from './formats/sarif.js';
import { outputTableFormat } from './formats/table.js';
import { prioritizeProblems } from './prioritize-problems.js';

/**
 * Generate report in the specified format
 */
export async function generateReport(
  problems: Problem[],
  fileCount: number,
  options: ReportOptions,
  logger: Logger
): Promise<void> {
  const { format, showStats, annotationsLimit, outputPath, baseline } = options;

  const prioritized =
    typeof annotationsLimit === 'number'
      ? prioritizeProblems(problems, annotationsLimit)
      : problems;

  switch (format) {
    case 'sarif':
      await outputSarifFormat(prioritized, outputPath, logger);
      break;
    case 'github-actions':
      outputGitHubActionsFormat(prioritized, logger);
      break;
    case 'json':
      await outputJsonFormat(prioritized, fileCount, outputPath, baseline, logger);
      break;
    default:
      outputTableFormat(problems, fileCount, showStats, logger);
      break;
  }

  if (prioritized.length > 0) {
    const limitInfoEnd =
      typeof options.annotationsLimit === 'number' ? ` (limit ${options.annotationsLimit})` : '';
    logger.log(`\n   Annotations prepared: ${prioritized.length}${limitInfoEnd}`);
  } else {
    logger.log(`\n   Annotations prepared: 0`);
  }
}

/**
 * Generate empty report for cases where no files are found
 */
export async function generateEmptyReport(options: ReportOptions, logger: Logger): Promise<void> {
  await generateReport([], 0, options, logger);
}
