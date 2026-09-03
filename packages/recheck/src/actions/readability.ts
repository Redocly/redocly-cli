import { cyan, green, yellow } from 'colorette';
import * as fs from 'fs/promises';
import * as pathModule from 'path';

import type { ResolvedRecheckConfig } from '../config/resolve.js';
import { discoverMarkdownFiles, loadChangedFiles } from '../core/files.js';
import { computeDocumentReadability, type DocumentReadability } from '../core/readability.js';
import type { Logger } from './logger.js';

export interface ReadabilityOptions {
  format?: 'table' | 'json';
  outputPath?: string;
  changedOnly?: boolean;
  changedListPath?: string;
}

interface FileReadability extends DocumentReadability {
  file: string;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value * 100) / 100;
}

/** Reports readability scores per file plus medians. Never gates: exits 0 whenever it ran. */
export async function runReadability(
  path: string = '.',
  config: ResolvedRecheckConfig,
  options: ReadabilityOptions,
  logger: Logger
): Promise<number> {
  const quiet = options.format === 'json' && !options.outputPath;
  const say = (line: string) => {
    if (!quiet) logger.log(line);
  };
  say(cyan(`📖 Measuring readability of: ${path}`));

  let files = await discoverMarkdownFiles(path);
  if (options.changedOnly) {
    const changed = await loadChangedFiles(options.changedListPath);
    const changedSet = new Set(
      (changed ?? []).map((p) => (pathModule.isAbsolute(p) ? p : pathModule.resolve(p)))
    );
    files = files.filter((file) => changedSet.has(pathModule.resolve(file)));
  }
  say(`   Scoring ${files.length} markdown file(s)`);

  const rows: FileReadability[] = [];
  for (const file of files) {
    let content: string;
    try {
      content = await fs.readFile(file, 'utf8');
    } catch {
      say(yellow(`   Warning: Could not read file ${file}`));
      continue;
    }
    rows.push({ file, ...computeDocumentReadability(content, { markdoc: config.markdoc }) });
  }
  rows.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));

  const scored = rows.filter((row) => row.fleschReadingEase !== null);
  const summary = {
    files: rows.length,
    scored: scored.length,
    medianFleschReadingEase: median(scored.map((row) => row.fleschReadingEase as number)),
    medianFleschKincaidGrade: median(scored.map((row) => row.fleschKincaidGrade as number)),
    medianAutomatedReadabilityIndex: median(
      scored.map((row) => row.automatedReadabilityIndex as number)
    ),
  };

  if (options.format === 'json') {
    const report = JSON.stringify({ summary, files: rows }, null, 2);
    if (options.outputPath && options.outputPath.length > 0) {
      await fs.writeFile(options.outputPath, report, 'utf8');
      say(`   Wrote JSON report to ${options.outputPath}`);
    } else {
      logger.log(report);
    }
  } else {
    logger.log('');
    logger.log('   FRE     Grade     ARI   Words   Sentences  File');
    for (const row of rows) {
      const fre =
        row.fleschReadingEase === null ? '     —' : row.fleschReadingEase.toFixed(1).padStart(6);
      const grade =
        row.fleschKincaidGrade === null ? '    —' : row.fleschKincaidGrade.toFixed(1).padStart(5);
      const ari =
        row.automatedReadabilityIndex === null
          ? '     —'
          : row.automatedReadabilityIndex.toFixed(1).padStart(6);
      logger.log(
        `${fre}  ${grade}  ${ari}  ${String(row.words).padStart(6)}  ${String(row.sentences).padStart(9)}  ${row.file}`
      );
    }
    logger.log('');
    logger.log(
      green(
        `   ${summary.scored} of ${summary.files} file(s) scored` +
          (summary.medianFleschReadingEase === null
            ? ''
            : ` • median FRE ${summary.medianFleschReadingEase} • median grade ${summary.medianFleschKincaidGrade} • median ARI ${summary.medianAutomatedReadabilityIndex}`)
      )
    );
  }
  return 0;
}
