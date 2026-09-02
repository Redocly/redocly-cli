import * as fs from 'fs/promises';

import type { Problem, Summary } from '../types/index.js';
import { getBreakdownStats } from './statistics.js';

/**
 * Build summary object from problems and file count
 */
export function buildSummary(
  problems: Problem[],
  fileCount: number,
  baseline?: Summary['baseline']
): Summary {
  const breakdown = getBreakdownStats(problems);
  const totalErrors = problems.filter((h) => h.severity === 'error').length;
  const totalWarnings = problems.filter((h) => h.severity === 'warn').length;
  const totalInfo = problems.filter((h) => h.severity === 'info').length;

  return {
    filesScanned: fileCount,
    totalIssues: problems.length,
    ...(baseline === undefined ? {} : { baseline }),
    totalErrors,
    totalWarnings,
    totalInfo,
    breakdown,
  };
}

/**
 * Emit summary in requested format to file or stdout
 */
export async function printSummary(
  summary: Summary,
  format: 'json' | 'text',
  path?: string
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
    for (const [rule, s] of Object.entries(summary.breakdown)) {
      lines.push(
        `${rule}: ${s.total} (errors: ${s.errors}, warnings: ${s.warnings}, info: ${s.info})`
      );
    }
    content = lines.join('\n');
  }

  if (path && path.length > 0) {
    await fs.writeFile(path, content, 'utf8');
    // oxlint-disable-next-line eslint/no-console -- engine output until the Logger lands
    console.log(`\n   Wrote summary to ${path}`);
  } else {
    // oxlint-disable-next-line eslint/no-console -- engine output until the Logger lands
    console.log('\n' + content);
  }
}
