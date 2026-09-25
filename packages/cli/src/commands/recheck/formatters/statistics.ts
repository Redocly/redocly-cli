import { logger } from '@redocly/openapi-core';
import { getBreakdownStats, type Problem } from '@redocly/recheck';
import { red, yellow, cyan } from 'colorette';

function output(line: string): void {
  logger.output(`${line}\n`);
}

/**
 * Display detailed statistics through the logger
 */
export function showDetailedStats(fileCount: number, problems: Problem[]): void {
  output(cyan('\n📊 Summary Statistics:'));
  output(`   ${fileCount} markdown file(s) scanned`);
  output(`   ${problems.length} total issue(s) detected`);

  const breakdown = getBreakdownStats(problems);

  if (Object.keys(breakdown).length > 0) {
    output('\n   Breakdown by rule:');

    // Sort rules by total count (descending)
    const sortedRules = Object.entries(breakdown).sort(
      ([, left], [, right]) => right.total - left.total
    );

    for (const [ruleName, stats] of sortedRules) {
      const parts: string[] = [];
      if (stats.errors > 0)
        parts.push(red(`${stats.errors} error${stats.errors !== 1 ? 's' : ''}`));
      if (stats.warnings > 0)
        parts.push(yellow(`${stats.warnings} warning${stats.warnings !== 1 ? 's' : ''}`));
      if (stats.info > 0) parts.push(cyan(`${stats.info} info`));

      const statsText = parts.length > 0 ? ` (${parts.join(', ')})` : '';
      const displayName = ruleName.replace('recheck/', '');
      output(`   ${displayName}: ${stats.total}${statsText}`);
    }
  }
}
