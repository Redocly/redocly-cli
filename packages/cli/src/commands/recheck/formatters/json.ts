import { logger } from '@redocly/openapi-core';
import { getBreakdownStats, type Problem } from '@redocly/recheck';

export function outputJsonFormat(
  problems: Problem[],
  fileCount: number,
  baseline?: { matched: number; new: number; stale: number },
  shown: Problem[] = problems
): void {
  const report = {
    summary: {
      filesScanned: fileCount,
      totalIssues: problems.length,
      ...(baseline === undefined ? {} : { baseline }),
      breakdown: getBreakdownStats(problems),
    },
    issues: shown,
  };

  logger.output(`${JSON.stringify(report, null, 2)}\n`);
}
