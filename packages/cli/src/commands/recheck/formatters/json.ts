import { logger } from '@redocly/openapi-core';
import { getBreakdownStats, type Problem } from '@redocly/recheck';
import * as fs from 'node:fs/promises';

/**
 * Output problems in JSON format to file or through the logger
 */
export async function outputJsonFormat(
  problems: Problem[],
  fileCount: number,
  outputPath: string | undefined,
  baseline: { matched: number; new: number; stale: number } | undefined
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
    logger.info(`\n   Wrote JSON report to ${outputPath}\n`);
  } else {
    logger.output(`${content}\n`);
  }
}
