import { logger } from '@redocly/openapi-core';
import { getBreakdownStats, type Problem } from '@redocly/recheck';

// The summary counts cover all `problems`. The issues list holds only the entries in `shown`.
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
