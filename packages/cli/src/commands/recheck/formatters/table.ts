import { logger } from '@redocly/openapi-core';
import type { Problem } from '@redocly/recheck';
import { red, green, yellow, cyan } from 'colorette';

import { showDetailedStats } from './statistics.js';

function output(line: string): void {
  logger.output(`${line}\n`);
}

/**
 * Output problems in table format through the logger
 */
export function outputTableFormat(
  problems: Problem[],
  fileCount: number,
  showStats: boolean | undefined
): void {
  if (problems.length === 0) {
    output(green('\n🎉 No issues found!'));
    if (showStats) {
      output(`\n📊 Summary: ${fileCount} file(s) scanned, 0 issues found.`);
    }
    return;
  }

  // Table format
  output(cyan(`\n📋 Found ${problems.length} issue(s):\n`));

  for (const problem of problems) {
    const severityColor =
      problem.severity === 'error' ? red : problem.severity === 'warn' ? yellow : cyan;
    const location = `${problem.file}:${problem.line}:${problem.column}`;
    const ruleDisplay = problem.ruleName.replace('recheck/', '');

    const fixMark = problem.fixable ? green(' [fixable]') : '';

    output(
      `${severityColor(ruleDisplay.padEnd(25))} ${location.padEnd(40)} ${problem.message}${fixMark}`
    );
  }

  const fixableCount = problems.filter((problem) => problem.fixable).length;
  if (fixableCount > 0) {
    output(green(`\n   ${fixableCount} of ${problems.length} fixable with --fix`));
  }

  // Summary
  const errorCount = problems.filter((problem) => problem.severity === 'error').length;
  const warnCount = problems.filter((problem) => problem.severity === 'warn').length;
  const infoCount = problems.filter((problem) => problem.severity === 'info').length;

  output('');
  if (errorCount > 0) output(red(`   ${errorCount} error(s)`));
  if (warnCount > 0) output(yellow(`   ${warnCount} warning(s)`));
  if (infoCount > 0) output(cyan(`   ${infoCount} info message(s)`));

  // Show detailed statistics if requested
  if (showStats) {
    showDetailedStats(fileCount, problems);
  }
}
