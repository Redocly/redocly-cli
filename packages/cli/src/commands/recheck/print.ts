import { logger } from '@redocly/openapi-core';
import {
  buildSummary,
  type BaselineRunResult,
  type LintRunReport,
  type LintRunResult,
  type MarkdocSchemaResult,
  type ReadabilityRunResult,
  type Timer,
} from '@redocly/recheck';
import { cyan, green, red, yellow } from 'colorette';

import { reportFixes } from './formatters/fixes.js';
import { generateReport } from './formatters/index.js';
import { outputReadabilityJson, outputReadabilityTable } from './formatters/readability.js';
import { printSummary } from './formatters/summary.js';

export interface LintPresentation {
  format: 'table' | 'json' | 'sarif' | 'github-actions';
  showStats?: boolean;
  annotationsLimit?: number;
  outputPath?: string;
  summary?: 'json' | 'text';
  summaryPath?: string;
}

function info(line: string): void {
  logger.info(`${line}\n`);
}

function runTargets(roots: string[], apiDescriptionCount: number): string[] {
  return [
    ...roots,
    ...(apiDescriptionCount > 0 ? [`${apiDescriptionCount} API description(s)`] : []),
  ];
}

export function printLintStart(roots: string[], apiDescriptionCount: number): void {
  const targets = runTargets(roots, apiDescriptionCount);
  info(
    cyan(`🏃 Running recheck on: ${targets.length > 0 ? targets.join(', ') : 'nothing to check'}`)
  );
}

function printFailure(message: string, timer: Timer): number {
  logger.error(red(`💥 Error running recheck: ${message}`) + '\n');
  info(`   Failed after ${timer.elapsedString()}`);
  return 1;
}

async function printEmptyReport(presentation: LintPresentation): Promise<void> {
  await generateReport([], 0, {
    format: presentation.format,
    showStats: presentation.showStats,
    annotationsLimit: presentation.annotationsLimit,
    outputPath: presentation.outputPath,
  });
  if (presentation.summary) {
    await printSummary(buildSummary([], 0), presentation.summary, presentation.summaryPath);
  }
}

// Prints the lines the engine printed before it reached the report or an error.
function printPreamble(report: LintRunReport): void {
  if (report.disabledRuleCount > 0) {
    info(`   Disabled ${report.disabledRuleCount} rule(s) (severity: off)`);
  }
  info(cyan(`\n🔧 Running ${report.ruleCount} rule(s)...`));
  if (report.empty) return;
  printNoPagesFound(report);
  info(`   Found ${report.filesFound} markdown file(s)`);
  if (report.changedFilter?.provided) {
    info(`   Filtering to ${report.changedFilter.matched} changed file(s)`);
  }
  for (const filePath of report.unreadableFiles) {
    info(yellow(`   Warning: Could not read file ${filePath}`));
  }
  if (report.unreadableFiles.length > 0) {
    info(
      yellow(
        `   Warning: Skipped ${report.unreadableFiles.length} unreadable file(s); linting ${report.scannedFileCount} file(s)`
      )
    );
  }
  printFixBlock(report);
  if (report.suppressedByIgnoreFile > 0) {
    info(`   ${report.suppressedByIgnoreFile} finding(s) suppressed by the ignore file.`);
  }
}

// Warns about roots without pages, unless the run has API descriptions to lint.
function printNoPagesFound(report: LintRunReport): void {
  if (report.filesFound === 0 && report.apiDescriptionCount === 0 && report.roots.length > 0) {
    info(yellow(`⚠️  No markdown files found in: ${report.roots.join(', ')}`));
  }
}

function printFixBlock(report: LintRunReport): void {
  if (!report.fixes) return;
  info(cyan(`\n🔧 Auto-fixing issues...`));
  if (report.fixes.applied.length > 0) {
    info(green(`✅ Auto-fixed ${report.fixes.applied.length} issue(s)!`));
    reportFixes(report.fixes.applied);
  } else {
    info(yellow(`⚠️  No auto-fixable issues found.`));
  }
  if (report.fixes.skippedCount > 0) {
    info(
      yellow(
        `⚠️  ${report.fixes.skippedCount} proposed fix(es) were not applied — either the edits ` +
          `still conflicted after repeated passes, or the fix was withheld to avoid ` +
          `rewriting a Markdoc tag — fix the reported issue(s) manually.`
      )
    );
  }
  if (report.descriptionFixesSkipped > 0) {
    info(
      yellow(
        `   Fixes do not apply inside API descriptions; ${report.descriptionFixesSkipped} fixable finding(s) skipped.`
      )
    );
  }
}

export async function printLintRun(
  result: LintRunResult,
  presentation: LintPresentation,
  timer: Timer
): Promise<number> {
  if (result.status === 'unknown-rule') {
    info(red(`❌ ${result.message}`));
    info(`   Available: ${result.available.join(', ')}`);
    return 1;
  }
  if (result.status === 'baseline-missing') {
    printPreamble(result.report);
    info(red(`❌ Baseline file not found: ${result.baselinePath}`));
    info(
      '   Run `redocly recheck --generate-baseline` to create it, or remove the `baseline` key from the recheck block.'
    );
    return 1;
  }
  if (result.status === 'failed') {
    printPreamble(result.report);
    return printFailure(result.message, timer);
  }

  // A report or summary that cannot be written fails the run like an engine error.
  try {
    return await printCompletedRun(result, presentation, timer);
  } catch (error) {
    return printFailure(error instanceof Error ? error.message : 'Unknown error', timer);
  }
}

// Prints the rest of a run that ended before the rules ran, then an empty report.
async function printEmptyRun(
  result: LintRunReport,
  presentation: LintPresentation,
  timer: Timer
): Promise<number> {
  printNoPagesFound(result);
  if (!result.changedFilter) {
    await printEmptyReport(presentation);
    info(`   Completed in ${timer.elapsedString()}`);
    return 0;
  }
  info(`   Found ${result.filesFound} markdown file(s)`);
  if (!result.changedFilter.provided) {
    info(
      yellow('   Warning: --changed-only set, but no changed files were provided. Nothing to scan.')
    );
    await printEmptyReport(presentation);
    return 0;
  }
  info(`   Filtering to ${result.changedFilter.matched} changed file(s)`);
  info(yellow('   Warning: No changed markdown files matched.'));
  await printEmptyReport(presentation);
  return 0;
}

async function printCompletedRun(
  result: LintRunReport,
  presentation: LintPresentation,
  timer: Timer
): Promise<number> {
  printPreamble(result);
  if (result.empty) return printEmptyRun(result, presentation, timer);

  if (result.baseline) {
    info(
      `   Baseline: ${result.baseline.matched} matched, ${result.baseline.new} new, ${result.baseline.stale} stale`
    );
  }

  const scannedFileCount = result.scannedFileCount + result.scannedDescriptionFileCount;
  await generateReport(result.problems, scannedFileCount, {
    format: presentation.format,
    showStats: presentation.showStats,
    annotationsLimit: presentation.annotationsLimit,
    outputPath: presentation.outputPath,
    baseline: result.baseline,
  });
  if (presentation.summary) {
    const summary = buildSummary(result.problems, scannedFileCount, result.baseline);
    await printSummary(summary, presentation.summary, presentation.summaryPath);
  }

  const errorCount = result.problems.filter((problem) => problem.severity === 'error').length;
  if (errorCount > 0) {
    info(red(`\n❌ Found ${errorCount} error(s). Exiting with code 1.`));
    info(`   Completed in ${timer.elapsedString()}`);
    return 1;
  }
  info(green(`\n✅ No errors found!`));
  if (result.problems.length > 0) {
    info(`   Found ${result.problems.length} warning(s) and info message(s).`);
  }
  info(`   Completed in ${timer.elapsedString()}`);
  return 0;
}

export async function printReadabilityRun(
  result: ReadabilityRunResult,
  presentation: { format: 'table' | 'json'; outputPath?: string }
): Promise<number> {
  info(cyan(`📖 Measuring readability of: ${result.roots.join(', ')}`));
  info(`   Scoring ${result.filesFound} markdown file(s)`);
  for (const file of result.unreadableFiles) {
    info(yellow(`   Warning: Could not read file ${file}`));
  }
  if (presentation.format === 'json') {
    await outputReadabilityJson(result, presentation.outputPath);
    return 0;
  }
  outputReadabilityTable(result);
  const { summary } = result;
  info(
    green(
      `   ${summary.scored} of ${summary.files} file(s) scored` +
        (summary.medianFleschReadingEase === null
          ? ''
          : ` • median FRE ${summary.medianFleschReadingEase} • median grade ${summary.medianFleschKincaidGrade} • median ARI ${summary.medianAutomatedReadabilityIndex}`)
    )
  );
  return 0;
}

export function printBaselineRun(result: BaselineRunResult): number {
  const targets = runTargets(result.roots, result.apiDescriptionCount);
  info(cyan(`📋 Building recheck baseline from: ${targets.join(', ')}`));
  info(`   Found ${result.filesFound} markdown file(s)`);
  for (const file of result.unreadableFiles) {
    info(yellow(`   Warning: Could not read file ${file}`));
  }
  info(green(`✅ Wrote ${result.outPath}`));
  info(
    `   ${result.errorCount} error finding(s) across ${result.baselinedFileCount} file(s) baselined.`
  );
  return 0;
}

export function printMarkdocSchemaRun(result: MarkdocSchemaResult): number {
  switch (result.status) {
    case 'written':
      info(`Wrote ${result.outPath}`);
      return 0;
    case 'up-to-date':
      info(`${result.outPath} is up to date.`);
      return 0;
    case 'missing':
      logger.error(
        `${result.outPath} does not exist — run \`redocly recheck --generate-markdoc-schema\` without --check to create it.\n`
      );
      return 1;
    case 'stale':
      logger.error(
        `${result.outPath} is stale — run \`redocly recheck --generate-markdoc-schema\` to regenerate it.\n`
      );
      return 1;
    case 'conflicts':
      for (const conflict of result.conflicts) {
        logger.error(`redocly recheck --generate-markdoc-schema: ${conflict}\n`);
      }
      return 1;
    case 'load-error':
      logger.error(`${result.message}\n`);
      return 1;
    case 'write-error':
      logger.error(
        `redocly recheck --generate-markdoc-schema: could not write ${result.outPath} — ${result.message}\n`
      );
      return 1;
  }
}
