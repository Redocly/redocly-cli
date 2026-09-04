import { red, green, yellow, cyan } from 'colorette';

import type { Logger } from '../../actions/logger.js';
import type { Problem } from '../../types/index.js';
import { showDetailedStats } from '../statistics.js';

/**
 * Output problems in table format through the logger
 */
export function outputTableFormat(
  problems: Problem[],
  fileCount: number,
  showStats: boolean | undefined,
  logger: Logger
): void {
  if (problems.length === 0) {
    logger.log(green('\n🎉 No issues found!'));
    if (showStats) {
      logger.log(`\n📊 Summary: ${fileCount} file(s) scanned, 0 issues found.`);
    }
    return;
  }

  // Table format
  logger.log(cyan(`\n📋 Found ${problems.length} issue(s):\n`));

  for (const problem of problems) {
    const severityColor =
      problem.severity === 'error' ? red : problem.severity === 'warn' ? yellow : cyan;
    const location = `${problem.file}:${problem.line}:${problem.column}`;
    const ruleDisplay = problem.ruleName.replace('recheck/', '');

    const fixMark = problem.fixable ? green(' [fixable]') : '';

    logger.log(
      `${severityColor(ruleDisplay.padEnd(25))} ${location.padEnd(40)} ${problem.message}${fixMark}`
    );
  }

  const fixableCount = problems.filter((problem) => problem.fixable).length;
  if (fixableCount > 0) {
    logger.log(green(`\n   ${fixableCount} of ${problems.length} fixable with --fix`));
  }

  // Summary
  const errorCount = problems.filter((h) => h.severity === 'error').length;
  const warnCount = problems.filter((h) => h.severity === 'warn').length;
  const infoCount = problems.filter((h) => h.severity === 'info').length;

  logger.log('');
  if (errorCount > 0) logger.log(red(`   ${errorCount} error(s)`));
  if (warnCount > 0) logger.log(yellow(`   ${warnCount} warning(s)`));
  if (infoCount > 0) logger.log(cyan(`   ${infoCount} info message(s)`));

  // Show detailed statistics if requested
  if (showStats) {
    showDetailedStats(fileCount, problems, logger);
  }
}
