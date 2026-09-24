import { logger } from '@redocly/openapi-core';
import type { ReadabilityRunResult } from '@redocly/recheck';
import * as fs from 'node:fs/promises';

export async function outputReadabilityJson(
  result: ReadabilityRunResult,
  outputPath?: string
): Promise<void> {
  const report = JSON.stringify({ summary: result.summary, files: result.rows }, null, 2);
  if (outputPath && outputPath.length > 0) {
    await fs.writeFile(outputPath, report, 'utf8');
    logger.info(`   Wrote JSON report to ${outputPath}\n`);
  } else {
    logger.output(`${report}\n`);
  }
}

export function outputReadabilityTable(result: ReadabilityRunResult): void {
  logger.output('\n');
  logger.output('   FRE     Grade     ARI   Words   Sentences  File\n');
  for (const row of result.rows) {
    const fre =
      row.fleschReadingEase === null ? '     —' : row.fleschReadingEase.toFixed(1).padStart(6);
    const grade =
      row.fleschKincaidGrade === null ? '    —' : row.fleschKincaidGrade.toFixed(1).padStart(5);
    const ari =
      row.automatedReadabilityIndex === null
        ? '     —'
        : row.automatedReadabilityIndex.toFixed(1).padStart(6);
    logger.output(
      `${fre}  ${grade}  ${ari}  ${String(row.words).padStart(6)}  ${String(row.sentences).padStart(9)}  ${row.file}\n`
    );
  }
  logger.output('\n');
}
