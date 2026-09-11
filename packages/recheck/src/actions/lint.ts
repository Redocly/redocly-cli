import { red, green, yellow, cyan } from 'colorette';
import * as fs from 'fs/promises';
import * as pathModule from 'path';

import type { ResolvedRecheckConfig } from '../config/resolve.js';
import { parseBaseline, compareToBaseline, baselineKeyMapper } from '../core/baseline.js';
import { loadChangedFiles, needsImageMetadata, loadImageMetadata } from '../core/files.js';
import { applyFilters, UnknownRuleNameError } from '../core/rule-filters.js';
import { runRules, runRulesUntilStable, type FileInput } from '../core/runner.js';
import { Timer } from '../core/timing.js';
import { reportFixes } from '../reporter/fixes.js';
import { generateReport, generateEmptyReport } from '../reporter/index.js';
import { buildSummary, printSummary } from '../reporter/summary.js';
import type { NormalizedRule } from '../types/index.js';
import type { Logger } from './logger.js';
import { discoverFilesForRoots, rootForFile, toRoots } from './roots.js';

export interface LintOptions {
  format?: 'table' | 'json' | 'sarif' | 'github-actions';
  severity?: 'off' | 'info' | 'warn' | 'warning' | 'error';
  tags?: (string | number)[];
  rules?: string[];
  excludeRules?: string[];
  stats?: boolean;
  fix?: boolean;
  annotationsLimit?: number;
  summary?: 'json' | 'text';
  summaryPath?: string;
  changedOnly?: boolean;
  changedListPath?: string;
  outputPath?: string;
}

/**
 * Run recheck on files under one or more roots
 */
export async function runLint(
  paths: string | string[] = '.',
  config: ResolvedRecheckConfig,
  options: LintOptions,
  logger: Logger
): Promise<number> {
  const roots = toRoots(paths);
  logger.log(cyan(`🏃 Running recheck on: ${roots.join(', ')}`));

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
      logger.log(red(`❌ ${error.message}`));
      logger.log(`   Available: ${error.available.join(', ')}`);
      return 1;
    }
    throw error;
  }

  if (disabledCount > 0) {
    logger.log(`   Disabled ${disabledCount} rule(s) (severity: off)`);
  }

  logger.log(cyan(`\n🔧 Running ${rulesToRun.length} rule(s)...`));

  const timer = new Timer();

  try {
    let files = await discoverFilesForRoots(roots);

    if (files.length === 0) {
      logger.log(yellow(`⚠️  No markdown files found in: ${roots.join(', ')}`));
      // With an active baseline on an exhaustive walk, fall through with zero
      // files instead of returning: the gate must still judge the walked root
      // (deleting the last baselined files turns their entries stale), and its
      // findings must flow through the same report/summary pipeline as every
      // other finding, so json/sarif/github-actions consumers see them too.
      // Changed-only runs are not exhaustive and keep proving nothing here.
      if (!(config.baselinePath && !options.changedOnly)) {
        await emitEmptyReport(options, logger);
        logger.log(`   Completed in ${timer.elapsedString()}`);
        return 0;
      }
    }

    logger.log(`   Found ${files.length} markdown file(s)`);

    // If changed-only, filter to files provided via --changed-list or stdin
    if (options.changedOnly) {
      const changedCandidates = await loadChangedFiles(options.changedListPath);
      if (!changedCandidates || changedCandidates.length === 0) {
        logger.log(
          yellow(
            '   Warning: --changed-only set, but no changed files were provided. Nothing to scan.'
          )
        );
        await emitEmptyReport(options, logger);
        return 0;
      }
      const changedSet = new Set(
        changedCandidates.map((p) => (pathModule.isAbsolute(p) ? p : pathModule.resolve(p)))
      );
      const filtered = files.filter((f: string) => changedSet.has(pathModule.resolve(f)));
      logger.log(`   Filtering to ${filtered.length} changed file(s)`);
      if (filtered.length === 0) {
        logger.log(yellow('   Warning: No changed markdown files matched.'));
        await emitEmptyReport(options, logger);
        return 0;
      }
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
        logger.log(yellow(`   Warning: Could not read file ${filePath}`));
      }
    }

    // Stats/file totals below must cover what was actually linted, not what
    // was requested — unreadable files were warned about and skipped above.
    const skippedCount = files.length - fileInputs.length;
    if (skippedCount > 0) {
      logger.log(
        yellow(
          `   Warning: Skipped ${skippedCount} unreadable file(s); linting ${fileInputs.length} file(s)`
        )
      );
    }

    // Under --fix, loop lint -> apply fixes -> re-lint until a pass produces
    // zero fixes (capped) so one CLI invocation fully converges instead of
    // requiring the user to re-run --fix multiple times — see
    // runRulesUntilStable in core/runner.ts.
    // Pre-applyFilters names, so severity:off rules are included — see
    // RunnerOptions.knownRuleNames.
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
      logger.log(cyan(`\n🔧 Auto-fixing issues...`));
      if (fixedFiles.size > 0) {
        for (const [filePath, fixedContent] of fixedFiles) {
          await fs.writeFile(filePath, fixedContent, 'utf8');
        }
        // `fixes` holds only the fixes that genuinely landed (see
        // RunResult.fixes) — proposals dropped by overlap resolution are
        // not counted as applied.
        logger.log(green(`✅ Auto-fixed ${fixes.length} issue(s)!`));
        reportFixes(fixes, logger);
      } else {
        logger.log(yellow(`⚠️  No auto-fixable issues found.`));
      }
      if (skippedFixes.length > 0) {
        // Two different causes land in the same `skippedFixes` list and the
        // runner doesn't tag which is which: edits still conflicting after the
        // pass limit, and fixes withheld because they couldn't preserve a
        // Markdoc tag. Naming only conflicting edits here would make a withheld
        // fix look like a bug rather than the tag-safety guard doing its job.
        logger.log(
          yellow(
            `⚠️  ${skippedFixes.length} proposed fix(es) were not applied — either the edits ` +
              `still conflicted after repeated passes, or the fix was withheld to avoid ` +
              `rewriting a Markdoc tag — fix the reported issue(s) manually.`
          )
        );
      }
    }

    // Baseline gate: errors only, scoped to what this run scanned and which
    // rules ran (see core/baseline.ts). Missing file with the key set is an
    // error with the fix in the message; a parse failure lands in the outer
    // catch like any other fatal.
    let reportProblems = allProblems;
    let baselineStats: { matched: number; new: number; stale: number } | undefined;
    if (config.baselinePath) {
      let baselineText: string;
      try {
        baselineText = await fs.readFile(config.baselinePath, 'utf8');
      } catch {
        logger.log(red(`❌ Baseline file not found: ${config.baselinePath}`));
        logger.log(
          '   Run `redocly recheck --generate-baseline` to create it, or remove the `baseline` key from the recheck block.'
        );
        return 1;
      }
      const baseline = parseBaseline(baselineText, config.baselinePath);
      const toKey = baselineKeyMapper(config.configDir);
      const comparison = compareToBaseline(allProblems, baseline, {
        scannedFiles: fileInputs.map((file) => file.path),
        executedRules: new Set(rulesToRun.map((rule) => rule.name)),
        toKey,
        // A changed-only run walks nothing exhaustively, so a missing file
        // proves nothing there; a plain run walked every root in full.
        scanRoots: options.changedOnly ? undefined : roots.map(toKey),
      });
      reportProblems = comparison.problems;
      baselineStats = {
        matched: comparison.suppressed,
        new: comparison.newFindings,
        stale: comparison.staleEntries,
      };
      logger.log(
        `   Baseline: ${comparison.suppressed} matched, ${comparison.newFindings} new, ${comparison.staleEntries} stale`
      );
    }

    await generateReport(
      reportProblems,
      fileInputs.length,
      {
        format: options.format || 'table',
        showStats: options.stats,
        annotationsLimit: options.annotationsLimit,
        outputPath: options.outputPath,
        baseline: baselineStats,
      },
      logger
    );

    if (options.summary) {
      const summary = buildSummary(reportProblems, fileInputs.length, baselineStats);
      await printSummary(summary, options.summary, options.summaryPath, logger);
    }

    const errorProblems = reportProblems.filter((p) => p.severity === 'error');
    if (errorProblems.length > 0) {
      logger.log(red(`\n❌ Found ${errorProblems.length} error(s). Exiting with code 1.`));
      logger.log(`   Completed in ${timer.elapsedString()}`);
      return 1;
    } else {
      logger.log(green(`\n✅ No errors found!`));
      if (reportProblems.length > 0) {
        logger.log(`   Found ${reportProblems.length} warning(s) and info message(s).`);
      }
      logger.log(`   Completed in ${timer.elapsedString()}`);
      return 0;
    }
  } catch (error) {
    logger.error(
      red(`💥 Error running recheck: ${error instanceof Error ? error.message : 'Unknown error'}`)
    );
    logger.log(`   Failed after ${timer.elapsedString()}`);
    return 1;
  }
}

/**
 * Emit empty report for cases where no files are found
 */
async function emitEmptyReport(options: LintOptions, logger: Logger): Promise<void> {
  await generateEmptyReport(
    {
      format: options.format || 'table',
      showStats: options.stats,
      annotationsLimit: options.annotationsLimit,
      outputPath: options.outputPath,
    },
    logger
  );
  if (options.summary) {
    const emptySummary = buildSummary([], 0);
    await printSummary(emptySummary, options.summary, options.summaryPath, logger);
  }
}
