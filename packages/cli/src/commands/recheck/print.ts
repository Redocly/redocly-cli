import { logger } from '@redocly/openapi-core';
import {
  generateReport,
  printSummary,
  buildSummary,
  reportFixes,
  type LintRunReport,
  type LintRunResult,
  type Logger,
  type Timer,
} from '@redocly/recheck';
import { cyan, green, red, yellow } from 'colorette';

export interface LintPresentation {
  format: 'table' | 'json' | 'sarif' | 'github-actions';
  showStats?: boolean;
  annotationsLimit?: number;
  outputPath?: string;
  summary?: 'json' | 'text';
  summaryPath?: string;
}

// Task 2 removes this adapter together with the engine reporter.
const engineLogger: Logger = {
  log: (line) => void logger.info(`${line}\n`),
  warn: (line) => void logger.warn(`${line}\n`),
  error: (line) => void logger.error(`${line}\n`),
  output: (line) => void logger.output(`${line}\n`),
};

function info(line: string): void {
  logger.info(`${line}\n`);
}

export function printLintStart(roots: string[]): void {
  info(cyan(`🏃 Running recheck on: ${roots.join(', ')}`));
}

function printFailure(message: string, timer: Timer): number {
  logger.error(red(`💥 Error running recheck: ${message}`) + '\n');
  info(`   Failed after ${timer.elapsedString()}`);
  return 1;
}

async function printEmptyReport(presentation: LintPresentation): Promise<void> {
  await generateReport(
    [],
    0,
    {
      format: presentation.format,
      showStats: presentation.showStats,
      annotationsLimit: presentation.annotationsLimit,
      outputPath: presentation.outputPath,
    },
    engineLogger
  );
  if (presentation.summary) {
    await printSummary(
      buildSummary([], 0),
      presentation.summary,
      presentation.summaryPath,
      engineLogger
    );
  }
}

// Prints the lines the engine printed before it reached the report or an error.
function printPreamble(report: LintRunReport): void {
  if (report.disabledRuleCount > 0) {
    info(`   Disabled ${report.disabledRuleCount} rule(s) (severity: off)`);
  }
  info(cyan(`\n🔧 Running ${report.ruleCount} rule(s)...`));
  if (report.empty) return;
  if (report.filesFound === 0) {
    info(yellow(`⚠️  No markdown files found in: ${report.roots.join(', ')}`));
  }
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
}

function printFixBlock(report: LintRunReport): void {
  if (!report.fixes) return;
  info(cyan(`\n🔧 Auto-fixing issues...`));
  if (report.fixes.applied.length > 0) {
    info(green(`✅ Auto-fixed ${report.fixes.applied.length} issue(s)!`));
    reportFixes(report.fixes.applied, engineLogger);
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
  if (result.filesFound === 0) {
    info(yellow(`⚠️  No markdown files found in: ${result.roots.join(', ')}`));
    await printEmptyReport(presentation);
    info(`   Completed in ${timer.elapsedString()}`);
    return 0;
  }
  info(`   Found ${result.filesFound} markdown file(s)`);
  if (!result.changedFilter?.provided) {
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

  await generateReport(
    result.problems,
    result.scannedFileCount,
    {
      format: presentation.format,
      showStats: presentation.showStats,
      annotationsLimit: presentation.annotationsLimit,
      outputPath: presentation.outputPath,
      baseline: result.baseline,
    },
    engineLogger
  );
  if (presentation.summary) {
    const summary = buildSummary(result.problems, result.scannedFileCount, result.baseline);
    await printSummary(summary, presentation.summary, presentation.summaryPath, engineLogger);
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
