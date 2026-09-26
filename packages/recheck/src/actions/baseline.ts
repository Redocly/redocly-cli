import * as fs from 'fs/promises';
import * as pathModule from 'path';

import { DEFAULT_BASELINE_FILE, type ResolvedRecheckConfig } from '../config/resolve.js';
import { buildBaseline, serializeBaseline, baselineKeyMapper } from '../core/baseline.js';
import { needsImageMetadata, loadImageMetadata } from '../core/files.js';
import { filterEnabledRules } from '../core/rule-filters.js';
import { runRules, type FileInput } from '../core/runner.js';
import type { Problem } from '../types/index.js';
import { lintEmbeddedInputs, type EmbeddedInput } from './embedded.js';
import { discoverFilesForRoots, rootForFile, toRoots } from './roots.js';

export interface BaselineRunResult {
  roots: string[];
  filesFound: number;
  unreadableFiles: string[];
  outPath: string;
  errorCount: number;
  baselinedFileCount: number;
  apiDescriptionCount: number;
}

/**
 * Runs the full configured rule set and writes the baseline file: one count
 * per file per rule, errors only, sorted for stable diffs. See
 * core/baseline.ts for the format and the lint gate's semantics.
 */
export async function generateBaseline(
  paths: string | string[] = '.',
  config: ResolvedRecheckConfig,
  options: {
    embeddedInputs?: EmbeddedInput[];
    // Returns true for a finding the caller's ignore file suppresses. The
    // baseline must drop the same findings `runLint` drops, or every run
    // reports the extra entries as stale.
    isIgnored?: (problem: Problem) => boolean;
  } = {}
): Promise<BaselineRunResult> {
  const embeddedInputs = options.embeddedInputs ?? [];
  const roots = Array.isArray(paths) && paths.length === 0 ? [] : toRoots(paths);
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

  if (embeddedInputs.length > 0) {
    const { enabled: descriptionRulesToRun } = filterEnabledRules(config.descriptionRules);
    const embedded = await lintEmbeddedInputs(embeddedInputs, descriptionRulesToRun, {
      knownRuleNames: new Set(config.rules.map((rule) => rule.name)),
      markdoc: config.markdoc,
      markdocSchema: config.markdocSchema,
    });
    problems.push(...embedded.problems);
  }

  const isIgnored = options.isIgnored;
  const kept = isIgnored ? problems.filter((problem) => !isIgnored(problem)) : problems;
  const errors = kept.filter((problem) => problem.severity === 'error');
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
    apiDescriptionCount: embeddedInputs.length,
  };
}
