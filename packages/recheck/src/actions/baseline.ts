import * as fs from 'fs/promises';
import * as pathModule from 'path';

import { DEFAULT_BASELINE_FILE, type ResolvedRecheckConfig } from '../config/resolve.js';
import { buildBaseline, serializeBaseline, baselineKeyMapper } from '../core/baseline.js';
import { needsImageMetadata, loadImageMetadata } from '../core/files.js';
import { filterEnabledRules } from '../core/rule-filters.js';
import { runRules, type FileInput } from '../core/runner.js';
import { discoverFilesForRoots, rootForFile, toRoots } from './roots.js';

export interface BaselineRunResult {
  roots: string[];
  filesFound: number;
  unreadableFiles: string[];
  outPath: string;
  errorCount: number;
  baselinedFileCount: number;
}

/**
 * Runs the full configured rule set and writes the baseline file: one count
 * per file per rule, errors only, sorted for stable diffs. See
 * core/baseline.ts for the format and the lint gate's semantics.
 */
export async function generateBaseline(
  paths: string | string[] = '.',
  config: ResolvedRecheckConfig
): Promise<BaselineRunResult> {
  const roots = toRoots(paths);
  const configDir = config.configDir;

  const { enabled: rulesToRun } = filterEnabledRules(config.rules);
  const files = await discoverFilesForRoots(roots);

  const loadImageMeta = needsImageMetadata(rulesToRun);
  const fileInputs: FileInput[] = [];
  const unreadableFiles: string[] = [];
  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const metadata = loadImageMeta
        ? await loadImageMetadata(filePath, content, rootForFile(filePath, roots))
        : undefined;
      fileInputs.push({ path: filePath, content, metadata });
    } catch {
      unreadableFiles.push(filePath);
    }
  }

  const { problems } = await runRules(fileInputs, rulesToRun, {
    knownRuleNames: new Set(config.rules.map((rule) => rule.name)),
    markdoc: config.markdoc,
    markdocSchema: config.markdocSchema,
  });

  const errors = problems.filter((problem) => problem.severity === 'error');
  const baseline = buildBaseline(errors, baselineKeyMapper(configDir));
  const outPath = pathModule.resolve(configDir, DEFAULT_BASELINE_FILE);
  await fs.writeFile(outPath, serializeBaseline(baseline), 'utf8');

  return {
    roots,
    filesFound: files.length,
    unreadableFiles,
    outPath,
    errorCount: errors.length,
    baselinedFileCount: Object.keys(baseline.files).length,
  };
}
