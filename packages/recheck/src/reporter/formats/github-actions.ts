import type { Logger } from '../../actions/logger.js';
import type { Problem } from '../../types/index.js';

/**
 * Output problems in GitHub Actions format for inline file annotations
 */
export function outputGitHubActionsFormat(problems: Problem[], logger: Logger): void {
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

    logger.output(`::${command} ${properties}::${escapedMessage}`);
  }
}
