import { logger } from '@redocly/openapi-core';
import { getBreakdownStats, type Problem } from '@redocly/recheck';

/**
 * Output problems in JSON format through the logger
 */
export function outputJsonFormat(
  problems: Problem[],
  fileCount: number,
  baseline?: { matched: number; new: number; stale: number }
): void {
  const report = {
    summary: {
      filesScanned: fileCount,
      totalIssues: problems.length,
      ...(baseline === undefined ? {} : { baseline }),
      breakdown: getBreakdownStats(problems),
    },
    issues: problems,
  };

  logger.output(`${JSON.stringify(report, null, 2)}\n`);
}
