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

export function printLintStart(roots: string[]): void {
  logger.info(`${cyan(`🏃 Running recheck on: ${roots.join(', ')}`)}\n`);
}

export function printReadabilityStart(roots: string[]): void {
  logger.info(`${cyan(`📖 Measuring readability of: ${roots.join(', ')}`)}\n`);
}

export function printBaselineStart(roots: string[]): void {
  logger.info(`${cyan(`📋 Building recheck baseline from: ${roots.join(', ')}`)}\n`);
}

function printFailure(message: string, timer: Timer): number {
  logger.error(red(`💥 Error running recheck: ${message}`) + '\n');
  logger.info(`   Failed after ${timer.elapsedString()}\n`);
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

// Prints the rule count, file count, file warnings, and the fix block from a lint run report.
function printPreamble(report: LintRunReport): void {
  if (report.disabledRuleCount > 0) {
    logger.info(`   Disabled ${report.disabledRuleCount} rule(s) (severity: off)\n`);
  }
  logger.info(`${cyan(`\n🔧 Running ${report.ruleCount} rule(s)...`)}\n`);
  if (report.empty) return;
  if (report.filesFound === 0) {
    logger.info(`${yellow(`⚠️  No markdown files found in: ${report.roots.join(', ')}`)}\n`);
  }
  logger.info(`   Found ${report.filesFound} markdown file(s)\n`);
  if (report.changedFilter?.provided) {
    logger.info(`   Filtering to ${report.changedFilter.matched} changed file(s)\n`);
  }
  for (const filePath of report.unreadableFiles) {
    logger.info(`${yellow(`   Warning: Could not read file ${filePath}`)}\n`);
  }
  if (report.unreadableFiles.length > 0) {
    logger.info(
      `${yellow(
        `   Warning: Skipped ${report.unreadableFiles.length} unreadable file(s); linting ${report.scannedFileCount} file(s)`
      )}\n`
    );
  }
  printFixBlock(report);
}

function printFixBlock(report: LintRunReport): void {
  if (!report.fixes) return;
  logger.info(`${cyan(`\n🔧 Auto-fixing issues...`)}\n`);
  if (report.fixes.applied.length > 0) {
    logger.info(`${green(`✅ Auto-fixed ${report.fixes.applied.length} issue(s)!`)}\n`);
    reportFixes(report.fixes.applied);
  } else {
    logger.info(`${yellow(`⚠️  No auto-fixable issues found.`)}\n`);
  }
  if (report.fixes.skippedCount > 0) {
    logger.info(
      `${yellow(
        `⚠️  ${report.fixes.skippedCount} proposed fix(es) were not applied — either the edits ` +
          `still conflicted after repeated passes, or the fix was withheld to avoid ` +
          `rewriting a Markdoc tag — fix the reported issue(s) manually.`
      )}\n`
    );
  }
}

export async function printLintRun(
  result: LintRunResult,
  presentation: LintPresentation,
  timer: Timer
): Promise<number> {
  if (result.status === 'unknown-rule') {
    logger.info(`${red(`❌ ${result.message}`)}\n`);
    logger.info(`   Available: ${result.available.join(', ')}\n`);
    return 1;
  }
  if (result.status === 'baseline-missing') {
    printPreamble(result.report);
    logger.info(`${red(`❌ Baseline file not found: ${result.baselinePath}`)}\n`);
    logger.info(
      `   Run \`redocly recheck --generate-baseline\` to create it, or remove the \`baseline\` key from the recheck block.\n`
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
  if (result.filesFound === 0) {
    logger.info(`${yellow(`⚠️  No markdown files found in: ${result.roots.join(', ')}`)}\n`);
    await printEmptyReport(presentation);
    logger.info(`   Completed in ${timer.elapsedString()}\n`);
    return 0;
  }
  logger.info(`   Found ${result.filesFound} markdown file(s)\n`);
  if (!result.changedFilter?.provided) {
    logger.info(
      `${yellow('   Warning: --changed-only set, but no changed files were provided. Nothing to scan.')}\n`
    );
    await printEmptyReport(presentation);
    return 0;
  }
  logger.info(`   Filtering to ${result.changedFilter.matched} changed file(s)\n`);
  logger.info(`${yellow('   Warning: No changed markdown files matched.')}\n`);
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
    logger.info(
      `   Baseline: ${result.baseline.matched} matched, ${result.baseline.new} new, ${result.baseline.stale} stale\n`
    );
  }

  await generateReport(result.problems, result.scannedFileCount, {
    format: presentation.format,
    showStats: presentation.showStats,
    annotationsLimit: presentation.annotationsLimit,
    outputPath: presentation.outputPath,
    baseline: result.baseline,
  });
  if (presentation.summary) {
    const summary = buildSummary(result.problems, result.scannedFileCount, result.baseline);
    await printSummary(summary, presentation.summary, presentation.summaryPath);
  }

  const errorCount = result.problems.filter((problem) => problem.severity === 'error').length;
  if (errorCount > 0) {
    logger.info(`${red(`\n❌ Found ${errorCount} error(s). Exiting with code 1.`)}\n`);
    logger.info(`   Completed in ${timer.elapsedString()}\n`);
    return 1;
  }
  logger.info(`${green(`\n✅ No errors found!`)}\n`);
  if (result.problems.length > 0) {
    logger.info(`   Found ${result.problems.length} warning(s) and info message(s).\n`);
  }
  logger.info(`   Completed in ${timer.elapsedString()}\n`);
  return 0;
}

export async function printReadabilityRun(
  result: ReadabilityRunResult,
  presentation: { format: 'table' | 'json'; outputPath?: string }
): Promise<number> {
  logger.info(`   Scoring ${result.filesFound} markdown file(s)\n`);
  for (const file of result.unreadableFiles) {
    logger.info(`${yellow(`   Warning: Could not read file ${file}`)}\n`);
  }
  if (presentation.format === 'json') {
    await outputReadabilityJson(result, presentation.outputPath);
    return 0;
  }
  outputReadabilityTable(result);
  const { summary } = result;
  logger.info(
    `${green(
      `   ${summary.scored} of ${summary.files} file(s) scored` +
        (summary.medianFleschReadingEase === null
          ? ''
          : ` • median FRE ${summary.medianFleschReadingEase} • median grade ${summary.medianFleschKincaidGrade} • median ARI ${summary.medianAutomatedReadabilityIndex}`)
    )}\n`
  );
  return 0;
}

export function printBaselineRun(result: BaselineRunResult): number {
  logger.info(`   Found ${result.filesFound} markdown file(s)\n`);
  for (const file of result.unreadableFiles) {
    logger.info(`${yellow(`   Warning: Could not read file ${file}`)}\n`);
  }
  logger.info(`${green(`✅ Wrote ${result.outPath}`)}\n`);
  logger.info(
    `   ${result.errorCount} error finding(s) across ${result.baselinedFileCount} file(s) baselined.\n`
  );
  return 0;
}

export function printMarkdocSchemaRun(result: MarkdocSchemaResult): number {
  switch (result.status) {
    case 'written':
      logger.info(`Wrote ${result.outPath}\n`);
      return 0;
    case 'up-to-date':
      logger.info(`${result.outPath} is up to date.\n`);
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
