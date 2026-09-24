import * as fs from 'fs/promises';
import * as pathModule from 'path';

import type { ResolvedRecheckConfig } from '../config/resolve.js';
import { parseBaseline, compareToBaseline, baselineKeyMapper } from '../core/baseline.js';
import { loadChangedFiles, needsImageMetadata, loadImageMetadata } from '../core/files.js';
import { applyFilters, matchesRuleName, UnknownRuleNameError } from '../core/rule-filters.js';
import { runRules, runRulesUntilStable, type FileInput } from '../core/runner.js';
import type { Fix, NormalizedRule, Problem } from '../types/index.js';
import { lintEmbeddedInputs, type EmbeddedInput } from './embedded.js';
import { discoverFilesForRoots, rootForFile, toRoots } from './roots.js';

export interface LintOptions {
  severity?: 'off' | 'info' | 'warn' | 'warning' | 'error';
  tags?: (string | number)[];
  rules?: string[];
  excludeRules?: string[];
  fix?: boolean;
  changedOnly?: boolean;
  changedListPath?: string;
  // Descriptions extracted from API documents; they lint in embedded mode.
  embeddedInputs?: EmbeddedInput[];
  // Local API files that were read for descriptions; a parsed file with none still counts as scanned.
  apiFiles?: string[];
  // API files that could not be read; their baseline entries are neither matched nor stale.
  unreadableFiles?: string[];
  // Returns true for a finding the caller's ignore file suppresses.
  isIgnored?: (problem: Problem) => boolean;
}

export interface LintRunReport {
  roots: string[];
  // Embedded descriptions passed in, before the changed-file filter.
  apiDescriptionCount: number;
  ruleCount: number;
  disabledRuleCount: number;
  filesFound: number;
  // Set only when `changedOnly` is on: how many of the found files the list kept,
  // and whether a list was provided at all.
  changedFilter?: { provided: boolean; matched: number };
  unreadableFiles: string[];
  scannedFileCount: number;
  // API files the description rules covered: files with embedded inputs and parsed API files.
  scannedDescriptionFileCount: number;
  executedDescriptionRuleCount: number;
  problems: Problem[];
  fixes?: { applied: Fix[]; skippedCount: number };
  // Fixable findings inside API descriptions; fixes never apply there.
  descriptionFixesSkipped: number;
  suppressedByIgnoreFile: number;
  baseline?: { matched: number; new: number; stale: number };
  // True when no file was linted and the run ended before the rules ran.
  empty: boolean;
}

export type LintRunResult =
  | { status: 'unknown-rule'; message: string; available: string[] }
  | { status: 'baseline-missing'; baselinePath: string; report: LintRunReport }
  | { status: 'failed'; message: string; report: LintRunReport }
  | ({ status: 'completed' } & LintRunReport);

/**
 * Run recheck on files under one or more roots
 */
export async function runLint(
  paths: string | string[] = '.',
  config: ResolvedRecheckConfig,
  options: LintOptions
): Promise<LintRunResult> {
  let embeddedInputs = options.embeddedInputs ?? [];
  let apiFiles = options.apiFiles ?? [];
  // An explicitly empty path list means "no page discovery"; the default
  // parameter still covers the call that passes no paths at all.
  const roots = Array.isArray(paths) && paths.length === 0 ? [] : toRoots(paths);

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
    apiDescriptionCount: embeddedInputs.length,
    ruleCount: rulesToRun.length,
    disabledRuleCount: disabledCount,
    filesFound: 0,
    unreadableFiles: [],
    scannedFileCount: 0,
    scannedDescriptionFileCount: 0,
    executedDescriptionRuleCount: 0,
    problems: [],
    descriptionFixesSkipped: 0,
    suppressedByIgnoreFile: 0,
    empty: true,
  };

  try {
    let files = await discoverFilesForRoots(roots);
    report.filesFound = files.length;

    if (files.length === 0 && embeddedInputs.length === 0) {
      // With an active baseline on an exhaustive walk, zero files still go
      // through the gate: deleting the last baselined files turns their
      // entries stale. Changed-only runs are not exhaustive and prove nothing
      // here, unless a scanned API file (parsed, no descriptions) still has
      // to face the gate.
      const gateActive =
        config.baselinePath !== undefined && (!options.changedOnly || apiFiles.length > 0);
      if (!gateActive) return { status: 'completed', ...report };
    }

    // The changed-file filter covers pages and API descriptions alike.
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
      const changedFiles = files.filter((file) => changedSet.has(pathModule.resolve(file)));
      const changedEmbeddedInputs = embeddedInputs.filter((input) =>
        changedSet.has(pathModule.resolve(input.file))
      );
      apiFiles = apiFiles.filter((file) => changedSet.has(pathModule.resolve(file)));
      report.changedFilter = { provided: true, matched: changedFiles.length };
      if (
        changedFiles.length === 0 &&
        changedEmbeddedInputs.length === 0 &&
        (apiFiles.length === 0 || config.baselinePath === undefined)
      ) {
        return { status: 'completed', ...report };
      }
      files = changedFiles;
      embeddedInputs = changedEmbeddedInputs;
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

    // Pre-applyFilters names, so severity:off rules are included — see
    // RunnerOptions.knownRuleNames.
    const runnerOptions = {
      knownRuleNames: new Set(config.rules.map((rule) => rule.name)),
      markdoc: config.markdoc,
      markdocSchema: config.markdocSchema,
    };
    const {
      problems: pageProblems,
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

    let problems: Problem[] = [...pageProblems];
    const executedDescriptionRules = new Set<string>();
    // A scanned API file with zero descriptions still needs the description
    // rules recorded as executed, so a leftover baseline entry for it goes stale.
    if (embeddedInputs.length > 0 || apiFiles.length > 0) {
      // The page side already validated the rule names. Description rules go
      // through `applyFilters` for severity and tags only; a name filter there
      // would treat a rule that severity or tags dropped as unknown and throw.
      const { filtered: severityAndTagsFiltered } = applyFilters(config.descriptionRules, {
        severity: options.severity,
        tags: options.tags,
      });
      let descriptionRules = severityAndTagsFiltered;
      if (options.rules !== undefined && options.rules.length > 0) {
        const ruleNames = options.rules;
        descriptionRules = descriptionRules.filter((rule) =>
          ruleNames.some((name) => matchesRuleName(rule, name))
        );
      }
      if (options.excludeRules !== undefined && options.excludeRules.length > 0) {
        const excludeRuleNames = options.excludeRules;
        descriptionRules = descriptionRules.filter(
          (rule) => !excludeRuleNames.some((name) => matchesRuleName(rule, name))
        );
      }
      const noRulesLeftForDescriptions =
        options.rules !== undefined && options.rules.length > 0 && descriptionRules.length === 0;

      if (!noRulesLeftForDescriptions) {
        for (const rule of descriptionRules) executedDescriptionRules.add(rule.name);
        const embedded = await lintEmbeddedInputs(embeddedInputs, descriptionRules, runnerOptions);
        problems.push(...embedded.problems);
        report.descriptionFixesSkipped = options.fix ? embedded.fixableCount : 0;
        report.executedDescriptionRuleCount = descriptionRules.length;
      }
    }
    if (options.isIgnored) {
      const isIgnored = options.isIgnored;
      const kept = problems.filter((problem) => !isIgnored(problem));
      report.suppressedByIgnoreFile = problems.length - kept.length;
      problems = kept;
    }

    // Union with `apiFiles`: a parsed API file with no local descriptions has
    // no entry in `embeddedInputs`, but it was still scanned.
    const scannedDescriptionFiles = [
      ...new Set([...embeddedInputs.map((input) => input.file), ...apiFiles]),
    ];
    report.scannedDescriptionFileCount = scannedDescriptionFiles.length;

    report.problems = problems;
    if (config.baselinePath) {
      let baselineText: string;
      try {
        baselineText = await fs.readFile(config.baselinePath, 'utf8');
      } catch {
        return { status: 'baseline-missing', baselinePath: config.baselinePath, report };
      }
      const baseline = parseBaseline(baselineText, config.baselinePath);
      const toKey = baselineKeyMapper(config.configDir);
      const comparison = compareToBaseline(problems, baseline, {
        scannedFiles: [...fileInputs.map((file) => file.path), ...scannedDescriptionFiles],
        // Page rules run over the walked roots, so a run with no root ran
        // none of them; description rules run over embedded inputs and
        // any parsed API file.
        executedRules: new Set([
          ...(roots.length > 0 ? rulesToRun.map((rule) => rule.name) : []),
          ...executedDescriptionRules,
        ]),
        toKey,
        // A changed-only run walks nothing exhaustively, so a missing file
        // proves nothing there; a plain run walked every root in full.
        scanRoots: options.changedOnly ? undefined : roots.map(toKey),
        skipFiles: new Set((options.unreadableFiles ?? []).map(toKey)),
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
