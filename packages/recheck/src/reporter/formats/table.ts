import { red, green, yellow, cyan } from 'colorette';

import type { Problem } from '../../types/index.js';
import { showDetailedStats } from '../statistics.js';

/**
 * Output problems in table format to console
 */
export function outputTableFormat(
  problems: Problem[],
  fileCount: number,
  showStats?: boolean
): void {
  if (problems.length === 0) {
    // oxlint-disable-next-line eslint/no-console -- engine output until the Logger lands
    console.log(green('\n🎉 No issues found!'));
    if (showStats) {
      // oxlint-disable-next-line eslint/no-console -- engine output until the Logger lands
      console.log(`\n📊 Summary: ${fileCount} file(s) scanned, 0 issues found.`);
    }
    return;
  }

  // Table format
  // oxlint-disable-next-line eslint/no-console -- engine output until the Logger lands
  console.log(cyan(`\n📋 Found ${problems.length} issue(s):\n`));

  for (const problem of problems) {
    const severityColor =
      problem.severity === 'error' ? red : problem.severity === 'warn' ? yellow : cyan;
    const location = `${problem.file}:${problem.line}:${problem.column}`;
    const ruleDisplay = problem.ruleName.replace('recheck/', '');

    const fixMark = problem.fixable ? green(' [fixable]') : '';

    // oxlint-disable-next-line eslint/no-console -- engine output until the Logger lands
    console.log(
      `${severityColor(ruleDisplay.padEnd(25))} ${location.padEnd(40)} ${problem.message}${fixMark}`
    );
  }

  const fixableCount = problems.filter((problem) => problem.fixable).length;
  if (fixableCount > 0) {
    // oxlint-disable-next-line eslint/no-console -- engine output until the Logger lands
    console.log(green(`\n   ${fixableCount} of ${problems.length} fixable with --fix`));
  }

  // Summary
  const errorCount = problems.filter((h) => h.severity === 'error').length;
  const warnCount = problems.filter((h) => h.severity === 'warn').length;
  const infoCount = problems.filter((h) => h.severity === 'info').length;

  // oxlint-disable-next-line eslint/no-console -- engine output until the Logger lands
  console.log('');
  // oxlint-disable-next-line eslint/no-console -- engine output until the Logger lands
  if (errorCount > 0) console.log(red(`   ${errorCount} error(s)`));
  // oxlint-disable-next-line eslint/no-console -- engine output until the Logger lands
  if (warnCount > 0) console.log(yellow(`   ${warnCount} warning(s)`));
  // oxlint-disable-next-line eslint/no-console -- engine output until the Logger lands
  if (infoCount > 0) console.log(cyan(`   ${infoCount} info message(s)`));

  // Show detailed statistics if requested
  if (showStats) {
    showDetailedStats(fileCount, problems);
  }
}
