import * as fs from 'fs/promises';
import * as pathModule from 'path';

import type { ResolvedRecheckConfig } from '../config/resolve.js';
import { loadChangedFiles } from '../core/files.js';
import { computeDocumentReadability, type DocumentReadability } from '../core/readability.js';
import { discoverFilesForRoots, toRoots } from './roots.js';

export interface ReadabilityOptions {
  changedOnly?: boolean;
  changedListPath?: string;
}

export interface FileReadability extends DocumentReadability {
  file: string;
}

export interface ReadabilityRunResult {
  roots: string[];
  filesFound: number;
  unreadableFiles: string[];
  rows: FileReadability[];
  summary: {
    files: number;
    scored: number;
    medianFleschReadingEase: number | null;
    medianFleschKincaidGrade: number | null;
    medianAutomatedReadabilityIndex: number | null;
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value * 100) / 100;
}

/** Scores readability per file plus medians. Never gates: the caller exits 0 whenever it ran. */
export async function runReadability(
  paths: string | string[] = '.',
  config: ResolvedRecheckConfig,
  options: ReadabilityOptions
): Promise<ReadabilityRunResult> {
  const roots = toRoots(paths);

  let files = await discoverFilesForRoots(roots);
  if (options.changedOnly) {
    const changed = await loadChangedFiles(options.changedListPath);
    const changedSet = new Set(
      (changed ?? []).map((candidate) =>
        pathModule.isAbsolute(candidate) ? candidate : pathModule.resolve(candidate)
      )
    );
    files = files.filter((file) => changedSet.has(pathModule.resolve(file)));
  }

  const rows: FileReadability[] = [];
  const unreadableFiles: string[] = [];
  for (const file of files) {
    let content: string;
    try {
      content = await fs.readFile(file, 'utf8');
    } catch {
      unreadableFiles.push(file);
      continue;
    }
    rows.push({ file, ...computeDocumentReadability(content, { markdoc: config.markdoc }) });
  }
  rows.sort((left, right) => (left.file < right.file ? -1 : left.file > right.file ? 1 : 0));

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

  return { roots, filesFound: files.length, unreadableFiles, rows, summary };
}
