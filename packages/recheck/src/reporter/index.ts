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

  if (prioritized.length > 0) {
    const limitInfoEnd =
      typeof options.annotationsLimit === 'number' ? ` (limit ${options.annotationsLimit})` : '';
    // oxlint-disable-next-line eslint/no-console -- reporter/config console output predates this relocation; Task 3 removes these entirely (see task-1-report.md), so this is a temporary suppression, not a permanent exception.
    console.log(`\n   Annotations prepared: ${prioritized.length}${limitInfoEnd}`);
  } else {
    // oxlint-disable-next-line eslint/no-console -- reporter/config console output predates this relocation; Task 3 removes these entirely (see task-1-report.md), so this is a temporary suppression, not a permanent exception.
    console.log(`\n   Annotations prepared: 0`);
  }
}

/**
 * Generate empty report for cases where no files are found
 */
export async function generateEmptyReport(options: ReportOptions): Promise<void> {
  await generateReport([], 0, options);
}
