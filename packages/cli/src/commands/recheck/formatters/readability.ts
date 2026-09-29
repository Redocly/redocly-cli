import { logger } from '@redocly/openapi-core';
import type { ReadabilityRunResult } from '@redocly/recheck';

export function outputReadabilityJson(result: ReadabilityRunResult): void {
  const report = JSON.stringify({ summary: result.summary, files: result.rows }, null, 2);
  logger.output(`${report}\n`);
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
