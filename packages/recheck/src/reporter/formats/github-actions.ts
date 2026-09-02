import type { Problem } from '../../types/index.js';

/**
 * Output problems in GitHub Actions format for inline file annotations
 */
export function outputGitHubActionsFormat(problems: Problem[]): void {
  for (const problem of problems) {
    const command = problem.severity === 'error' ? 'error' : 'warning';
    const properties = [
      `title=${problem.ruleName}`,
      `file=${problem.file}`,
      `line=${problem.line}`,
      `endLine=${problem.line}`,
      `col=${problem.column}`,
      `endColumn=${problem.column + (problem.match?.length || 1)}`,
    ].join(',');

    // Escape the message for GitHub Actions format
    const escapedMessage = problem.message.replace(/::/g, '%3A%3A').replace(/\n/g, '%0A');

    // oxlint-disable-next-line eslint/no-console -- engine output until the Logger lands
    console.log(`::${command} ${properties}::${escapedMessage}`);
  }
}
