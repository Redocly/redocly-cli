import { red, yellow, cyan } from 'colorette';

import type { Logger } from '../actions/logger.js';
import type { Problem, RuleBreakdown } from '../types/index.js';

/**
 * Generate breakdown statistics by rule
 */
export function getBreakdownStats(problems: Problem[]): RuleBreakdown {
  const breakdown: RuleBreakdown = {};

  for (const problem of problems) {
    if (!breakdown[problem.ruleName]) {
      breakdown[problem.ruleName] = { errors: 0, warnings: 0, info: 0, total: 0 };
    }

    breakdown[problem.ruleName].total++;

    switch (problem.severity) {
      case 'error':
        breakdown[problem.ruleName].errors++;
        break;
      case 'warn':
        breakdown[problem.ruleName].warnings++;
        break;
      case 'info':
        breakdown[problem.ruleName].info++;
        break;
    }
  }

  return breakdown;
}

/**
 * Display detailed statistics through the logger
 */
export function showDetailedStats(fileCount: number, problems: Problem[], logger: Logger): void {
  logger.log(cyan('\n📊 Summary Statistics:'));
  logger.log(`   ${fileCount} markdown file(s) scanned`);
  logger.log(`   ${problems.length} total issue(s) detected`);

  const breakdown = getBreakdownStats(problems);

  if (Object.keys(breakdown).length > 0) {
    logger.log('\n   Breakdown by rule:');

    // Sort rules by total count (descending)
    const sortedRules = Object.entries(breakdown).sort(([, a], [, b]) => b.total - a.total);

    for (const [ruleName, stats] of sortedRules) {
      const parts: string[] = [];
      if (stats.errors > 0)
        parts.push(red(`${stats.errors} error${stats.errors !== 1 ? 's' : ''}`));
      if (stats.warnings > 0)
        parts.push(yellow(`${stats.warnings} warning${stats.warnings !== 1 ? 's' : ''}`));
      if (stats.info > 0) parts.push(cyan(`${stats.info} info`));

      const statsText = parts.length > 0 ? ` (${parts.join(', ')})` : '';
      const displayName = ruleName.replace('recheck/', '');
      logger.log(`   ${displayName}: ${stats.total}${statsText}`);
    }
  }
}
