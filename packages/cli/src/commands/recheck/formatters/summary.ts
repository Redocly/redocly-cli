import { logger } from '@redocly/openapi-core';
import type { Summary } from '@redocly/recheck';
import * as fs from 'node:fs/promises';

/**
 * Emit summary in requested format to file or through the logger
 */
export async function printSummary(
  summary: Summary,
  format: 'json' | 'text',
  path: string | undefined
): Promise<void> {
  let content = '';
  if (format === 'json') {
    content = JSON.stringify(summary, null, 2);
  } else {
    const lines: string[] = [];
    lines.push(`Files scanned: ${summary.filesScanned}`);
    lines.push(`Total issues: ${summary.totalIssues}`);
    lines.push(
      `Errors: ${summary.totalErrors}, Warnings: ${summary.totalWarnings}, Info: ${summary.totalInfo}`
    );
    lines.push('');
    lines.push('Breakdown by rule:');
    for (const [rule, ruleStats] of Object.entries(summary.breakdown)) {
      lines.push(
        `${rule}: ${ruleStats.total} (errors: ${ruleStats.errors}, warnings: ${ruleStats.warnings}, info: ${ruleStats.info})`
      );
    }
    content = lines.join('\n');
  }

  if (path && path.length > 0) {
    await fs.writeFile(path, content, 'utf8');
    logger.info(`\n   Wrote summary to ${path}\n`);
  } else {
    logger.info(`\n${content}\n`);
  }
}
