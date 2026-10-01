import { logger } from '@redocly/openapi-core';
import type { Problem } from '@redocly/recheck';
import { red, green, yellow, cyan } from 'colorette';

import { showDetailedStats } from './statistics.js';

// The header, counts and stats cover all `problems`. The table lists only the rows in `shown`.
export function outputTableFormat(
  problems: Problem[],
  fileCount: number,
  showStats: boolean | undefined,
  shown: Problem[] = problems
): void {
  if (problems.length === 0) {
    logger.output(`${green('\n🎉 No issues found!')}\n`);
    if (showStats) {
      logger.output(`\n📊 Summary: ${fileCount} file(s) scanned, 0 issues found.\n`);
    }
    return;
  }

  logger.output(`${cyan(`\n📋 Found ${problems.length} issue(s):\n`)}\n`);

  for (const problem of shown) {
    const severityColor =
      problem.severity === 'error' ? red : problem.severity === 'warn' ? yellow : cyan;
    const location = `${problem.file}:${problem.line}:${problem.column}`;
    const ruleDisplay = problem.ruleName.replace('recheck/', '');

    const fixMark = problem.fixable ? green(' [fixable]') : '';

    logger.output(
      `${severityColor(ruleDisplay.padEnd(25))} ${location.padEnd(40)} ${problem.message}${fixMark}\n`
    );
  }

  const fixableCount = problems.filter((problem) => problem.fixable).length;
  if (fixableCount > 0) {
    logger.output(`${green(`\n   ${fixableCount} of ${problems.length} fixable with --fix`)}\n`);
  }

  const errorCount = problems.filter((problem) => problem.severity === 'error').length;
  const warnCount = problems.filter((problem) => problem.severity === 'warn').length;
  const infoCount = problems.filter((problem) => problem.severity === 'info').length;

  logger.output('\n');
  if (errorCount > 0) logger.output(`${red(`   ${errorCount} error(s)`)}\n`);
  if (warnCount > 0) logger.output(`${yellow(`   ${warnCount} warning(s)`)}\n`);
  if (infoCount > 0) logger.output(`${cyan(`   ${infoCount} info message(s)`)}\n`);

  if (showStats) {
    showDetailedStats(fileCount, problems);
  }
}
