import * as fs from 'fs/promises';

import type { Problem } from '../../types/index.js';
import { getBreakdownStats } from '../statistics.js';

/**
 * Output problems in JSON format to file or stdout
 */
export async function outputJsonFormat(
  problems: Problem[],
  fileCount: number,
  outputPath?: string,
  baseline?: { matched: number; new: number; stale: number }
): Promise<void> {
  const report = {
    summary: {
      filesScanned: fileCount,
      totalIssues: problems.length,
      ...(baseline === undefined ? {} : { baseline }),
      breakdown: getBreakdownStats(problems),
    },
    issues: problems,
  };

  const content = JSON.stringify(report, null, 2);

  if (outputPath && outputPath.length > 0) {
    await fs.writeFile(outputPath, content, 'utf8');
    // oxlint-disable-next-line eslint/no-console -- reporter/config console output predates this relocation; Task 3 removes these entirely (see task-1-report.md), so this is a temporary suppression, not a permanent exception.
    console.log(`\n   Wrote JSON report to ${outputPath}`);
  } else {
    // oxlint-disable-next-line eslint/no-console -- reporter/config console output predates this relocation; Task 3 removes these entirely (see task-1-report.md), so this is a temporary suppression, not a permanent exception.
    console.log('\n' + content);
  }
}
