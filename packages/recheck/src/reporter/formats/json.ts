import * as fs from 'fs/promises';

import type { Logger } from '../../actions/logger.js';
import type { Problem } from '../../types/index.js';
import { getBreakdownStats } from '../statistics.js';

/**
 * Output problems in JSON format to file or through the logger
 */
export async function outputJsonFormat(
  problems: Problem[],
  fileCount: number,
  outputPath: string | undefined,
  baseline: { matched: number; new: number; stale: number } | undefined,
  logger: Logger
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
    logger.log(`\n   Wrote JSON report to ${outputPath}`);
  } else {
    logger.output(content);
  }
}
