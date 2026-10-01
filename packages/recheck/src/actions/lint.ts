import * as fs from 'fs/promises';
import * as pathModule from 'path';

import type { ResolvedRecheckConfig } from '../config/resolve.js';
import { parseBaseline, compareToBaseline, baselineKeyMapper } from '../core/baseline.js';
import { loadChangedFiles, needsImageMetadata, loadImageMetadata } from '../core/files.js';
import { applyFilters, UnknownRuleNameError } from '../core/rule-filters.js';
import { runRules, runRulesUntilStable, type FileInput } from '../core/runner.js';
import type { Fix, NormalizedRule, Problem } from '../types/index.js';
import { discoverFilesForRoots, rootForFile, toRoots } from './roots.js';

export interface LintOptions {
  severity?: 'off' | 'info' | 'warn' | 'warning' | 'error';
  tags?: (string | number)[];
  rules?: string[];
  excludeRules?: string[];
  fix?: boolean;
  changedOnly?: boolean;
  changedListPath?: string;
}

export interface LintRunReport {
  roots: string[];
  ruleCount: number;
  disabledRuleCount: number;
  filesFound: number;
  // Only set with `changedOnly`: how many found files are on the changed list.
  changedFilter?: { provided: boolean; matched: number };
  unreadableFiles: string[];
  scannedFileCount: number;
  problems: Problem[];
  fixes?: { applied: Fix[]; skippedCount: number };
  baseline?: { matched: number; new: number; stale: number };
  empty: boolean;
}

export type LintRunResult =
  | { status: 'unknown-rule'; message: string; available: string[] }
  | { status: 'baseline-missing'; baselinePath: string; report: LintRunReport }
  | { status: 'failed'; message: string; report: LintRunReport }
  | ({ status: 'completed' } & LintRunReport);

export async function runLint(
  paths: string | string[] = '.',
  config: ResolvedRecheckConfig,
  options: LintOptions
): Promise<LintRunResult> {
  const roots = toRoots(paths);

  let rulesToRun: NormalizedRule[];
  let disabledCount: number;
  try {
    ({ filtered: rulesToRun, disabledCount } = applyFilters(config.rules, {
      severity: options.severity,
      tags: options.tags,
      rules: options.rules,
      excludeRules: options.excludeRules,
    }));
  } catch (error) {
    if (error instanceof UnknownRuleNameError) {
      return { status: 'unknown-rule', message: error.message, available: error.available };
    }
    throw error;
  }

  const report: LintRunReport = {
    roots,
    ruleCount: rulesToRun.length,
    disabledRuleCount: disabledCount,
    filesFound: 0,
    unreadableFiles: [],
    scannedFileCount: 0,
    problems: [],
    empty: true,
  };

  try {
    let files = await discoverFilesForRoots(roots);
    report.filesFound = files.length;

    // With a baseline, still compare when no files are found: deleting the last
    // baselined files makes their entries stale. Changed-only runs skip this.
    if (files.length === 0 && !(config.baselinePath && !options.changedOnly)) {
      return { status: 'completed', ...report };
    }

    if (options.changedOnly) {
      const changedCandidates = await loadChangedFiles(options.changedListPath);
      if (!changedCandidates || changedCandidates.length === 0) {
        report.changedFilter = { provided: false, matched: 0 };
        return { status: 'completed', ...report };
      }
      const changedSet = new Set(
        changedCandidates.map((candidate) =>
          pathModule.isAbsolute(candidate) ? candidate : pathModule.resolve(candidate)
        )
      );
      const filtered = files.filter((file) => changedSet.has(pathModule.resolve(file)));
      report.changedFilter = { provided: true, matched: filtered.length };
      if (filtered.length === 0) return { status: 'completed', ...report };
      files = filtered;
    }

    const loadImageMeta = needsImageMetadata(rulesToRun);
    const fileInputs: FileInput[] = [];
    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const metadata = loadImageMeta
          ? await loadImageMetadata(filePath, content, rootForFile(filePath, roots))
          : undefined;
        fileInputs.push({ path: filePath, content, metadata });
      } catch {
        report.unreadableFiles.push(filePath);
      }
    }
    report.scannedFileCount = fileInputs.length;
    report.empty = false;

    // Includes rules set to `off`, so a directive that turns one off is not reported as unknown.
    const runnerOptions = {
      knownRuleNames: new Set(config.rules.map((rule) => rule.name)),
      markdoc: config.markdoc,
      markdocSchema: config.markdocSchema,
    };
    const {
      problems: allProblems,
      fixedFiles,
      fixes,
      skippedFixes,
    } = options.fix
      ? await runRulesUntilStable(fileInputs, rulesToRun, runnerOptions)
      : await runRules(fileInputs, rulesToRun, runnerOptions);

    if (options.fix) {
      for (const [filePath, fixedContent] of fixedFiles) {
        await fs.writeFile(filePath, fixedContent, 'utf8');
      }
      report.fixes = { applied: fixes, skippedCount: skippedFixes.length };
    }

    report.problems = allProblems;
    if (config.baselinePath) {
      let baselineText: string;
      try {
        baselineText = await fs.readFile(config.baselinePath, 'utf8');
      } catch {
        return { status: 'baseline-missing', baselinePath: config.baselinePath, report };
      }
      const baseline = parseBaseline(baselineText, config.baselinePath);
      const toKey = baselineKeyMapper(config.configDir);
      const comparison = compareToBaseline(allProblems, baseline, {
        scannedFiles: fileInputs.map((file) => file.path),
        executedRules: new Set(rulesToRun.map((rule) => rule.name)),
        toKey,
        // A changed-only run does not scan every file, so a missing file means nothing there.
        scanRoots: options.changedOnly ? undefined : roots.map(toKey),
      });
      report.problems = comparison.problems;
      report.baseline = {
        matched: comparison.suppressed,
        new: comparison.newFindings,
        stale: comparison.staleEntries,
      };
    }

    return { status: 'completed', ...report };
  } catch (error) {
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      report,
    };
  }
}
