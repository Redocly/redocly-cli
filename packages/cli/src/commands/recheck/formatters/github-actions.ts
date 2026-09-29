import { logger } from '@redocly/openapi-core';
import type { Problem } from '@redocly/recheck';

// Each severity maps to the workflow command of the same weight, so a
// workflow that fails on warnings does not fail on info findings. A rule
// that is off reports nothing, so its entry never prints.
const COMMAND_BY_SEVERITY: Record<Problem['severity'], string> = {
  error: 'error',
  warn: 'warning',
  info: 'notice',
  off: 'notice',
};

function escapeProperty(value: string): string {
  return value
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C');
}

/**
 * Output problems in GitHub Actions format for inline file annotations
 */
export function outputGitHubActionsFormat(problems: Problem[]): void {
  for (const problem of problems) {
    const command = COMMAND_BY_SEVERITY[problem.severity];
    const properties = [
      `title=${escapeProperty(problem.ruleName)}`,
      `file=${escapeProperty(problem.file)}`,
      `line=${problem.line}`,
      `endLine=${problem.line}`,
      `col=${problem.column}`,
      `endColumn=${problem.column + (problem.match?.length || 1)}`,
    ].join(',');

    const message = problem.message
      .replace(/%/g, '%25')
      .replace(/\r/g, '%0D')
      .replace(/\n/g, '%0A');

    logger.output(`::${command} ${properties}::${message}\n`);
  }
}
