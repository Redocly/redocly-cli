import {
  Timer,
  type BaselineRunResult,
  type Fix,
  type LintRunReport,
  type Problem,
  type ReadabilityRunResult,
} from '@redocly/recheck';
import { cyan, green, yellow } from 'colorette';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { printBaselineRun, printLintRun, printReadabilityRun } from '../print.js';
import { captureLogger } from './capture-logger.js';

const EMPTY_REPORT: LintRunReport = {
  roots: ['docs'],
  apiDescriptionCount: 0,
  ruleCount: 3,
  disabledRuleCount: 0,
  filesFound: 0,
  unreadableFiles: [],
  scannedFileCount: 0,
  scannedDescriptionFileCount: 0,
  executedDescriptionRuleCount: 0,
  descriptionFixesSkipped: 0,
  suppressedByIgnoreFile: 0,
  empty: true,
  problems: [],
};

const LINTED_REPORT: LintRunReport = {
  ...EMPTY_REPORT,
  filesFound: 2,
  scannedFileCount: 2,
  empty: false,
};

const WARNING: Problem = {
  file: 'docs/index.md',
  line: 3,
  column: 1,
  text: '',
  match: '',
  ruleName: 'recheck/no-todos',
  severity: 'warn',
  message: 'TODO found.',
};

const ERROR: Problem = {
  file: 'docs/index.md',
  line: 3,
  column: 1,
  text: '',
  match: '',
  ruleName: 'recheck/line-length',
  severity: 'error',
  message: 'Line too long.',
};

const FIX: Fix = {
  file: 'docs/index.md',
  ruleName: 'recheck/no-trailing-spaces',
  lineNumber: 2,
  editColumn: 24,
  deleteCount: 3,
};

afterEach(() => vi.restoreAllMocks());

describe('printLintRun', () => {
  it('prints a completed run with one error and exits 1', async () => {
    const { stderr, stdout } = captureLogger();
    const code = await printLintRun(
      {
        status: 'completed',
        ...EMPTY_REPORT,
        filesFound: 1,
        scannedFileCount: 1,
        empty: false,
        problems: [
          {
            file: 'docs/index.md',
            line: 3,
            column: 1,
            text: '',
            match: '',
            ruleName: 'recheck/line-length',
            severity: 'error',
            message: 'Line too long.',
          },
        ],
      },
      { format: 'table' },
      new Timer()
    );
    expect(code).toBe(1);
    expect(stderr.join('')).toContain('Running 3 rule(s)');
    expect(stderr.join('')).toContain('Found 1 error(s). Exiting with code 1.');
    expect(stdout.join('')).toContain('line-length');
  });

  it('prints the unknown-rule result and exits 1', async () => {
    const { stderr } = captureLogger();
    const code = await printLintRun(
      { status: 'unknown-rule', message: 'no rule matches x', available: ['recheck/line-length'] },
      { format: 'table' },
      new Timer()
    );
    expect(code).toBe(1);
    expect(stderr.join('')).toContain('no rule matches x');
    expect(stderr.join('')).toContain('Available: recheck/line-length');
  });

  it('prints an empty run with an empty report and exits 0', async () => {
    const { stderr } = captureLogger();
    const code = await printLintRun(
      { status: 'completed', ...EMPTY_REPORT },
      { format: 'table' },
      new Timer()
    );
    expect(code).toBe(0);
    const printed = stderr.join('');
    expect(printed).toContain('No markdown files found in: docs');
    expect(printed).toContain('\n   Annotations prepared: 0\n');
    expect(printed).toMatch(/ {3}Completed in \d+ms\n$/);
    expect(printed).not.toContain('Found 0 markdown file(s)');
  });

  it('prints a failed result with the elapsed time and exits 1', async () => {
    const { stderr } = captureLogger();
    const code = await printLintRun(
      { status: 'failed', message: 'baseline file is not valid', report: EMPTY_REPORT },
      { format: 'table' },
      new Timer()
    );
    expect(code).toBe(1);
    expect(stderr.join('')).toContain('💥 Error running recheck: baseline file is not valid');
    expect(stderr.join('')).toMatch(/ {3}Failed after \d+ms\n$/);
  });

  it('prints the applied fixes and the count of skipped fixes', async () => {
    const { stderr } = captureLogger();
    const code = await printLintRun(
      { status: 'completed', ...LINTED_REPORT, fixes: { applied: [FIX], skippedCount: 2 } },
      { format: 'table' },
      new Timer()
    );
    expect(code).toBe(0);
    const printed = stderr.join('');
    expect(printed).toContain('🔧 Auto-fixing issues...');
    expect(printed).toContain('✅ Auto-fixed 1 issue(s)!');
    expect(printed).toContain('✓ Line 2 (recheck/no-trailing-spaces): removed 3 character(s)');
    expect(printed).toContain('⚠️  2 proposed fix(es) were not applied');
  });

  it('prints the description fix-skip notice inside the fix block', async () => {
    const { stderr } = captureLogger();
    await printLintRun(
      {
        status: 'completed',
        ...LINTED_REPORT,
        fixes: { applied: [], skippedCount: 0 },
        descriptionFixesSkipped: 2,
      },
      { format: 'table' },
      new Timer()
    );
    const printed = stderr.join('');
    const noticeAt = printed.indexOf(
      '   Fixes do not apply inside API descriptions; 2 fixable finding(s) skipped.'
    );
    expect(noticeAt).toBeGreaterThan(printed.indexOf('⚠️  No auto-fixable issues found.'));
    expect(noticeAt).toBeLessThan(printed.indexOf('✅ No errors found!'));
  });

  it('prints the count of findings the ignore file suppressed before the baseline line', async () => {
    const { stderr } = captureLogger();
    await printLintRun(
      {
        status: 'completed',
        ...LINTED_REPORT,
        suppressedByIgnoreFile: 1,
        baseline: { matched: 0, new: 0, stale: 0 },
      },
      { format: 'table' },
      new Timer()
    );
    const printed = stderr.join('');
    const suppressedAt = printed.indexOf('   1 finding(s) suppressed by the ignore file.\n');
    expect(suppressedAt).toBeGreaterThan(-1);
    expect(suppressedAt).toBeLessThan(printed.indexOf('   Baseline: 0 matched, 0 new, 0 stale'));
  });

  it('prints an empty report when --changed-only gets no changed files', async () => {
    const { stderr } = captureLogger();
    const code = await printLintRun(
      {
        status: 'completed',
        ...EMPTY_REPORT,
        filesFound: 2,
        changedFilter: { provided: false, matched: 0 },
      },
      { format: 'table' },
      new Timer()
    );
    expect(code).toBe(0);
    const printed = stderr.join('');
    expect(printed).toContain('   Found 2 markdown file(s)\n');
    expect(printed).toContain(
      'Warning: --changed-only set, but no changed files were provided. Nothing to scan.'
    );
    expect(printed).toContain('\n   Annotations prepared: 0\n');
    expect(printed).not.toContain('Filtering to');
    expect(printed).not.toContain('Completed in');
  });

  it('prints an empty report when no changed file matches', async () => {
    const { stderr } = captureLogger();
    const code = await printLintRun(
      {
        status: 'completed',
        ...EMPTY_REPORT,
        filesFound: 2,
        changedFilter: { provided: true, matched: 0 },
      },
      { format: 'table' },
      new Timer()
    );
    expect(code).toBe(0);
    const printed = stderr.join('');
    expect(printed).toContain('   Found 2 markdown file(s)\n   Filtering to 0 changed file(s)\n');
    expect(printed).toContain('Warning: No changed markdown files matched.');
    expect(printed).toContain('\n   Annotations prepared: 0\n');
  });

  it('warns about each unreadable file and the count of skipped files', async () => {
    const { stderr } = captureLogger();
    await printLintRun(
      {
        status: 'completed',
        ...LINTED_REPORT,
        filesFound: 3,
        scannedFileCount: 1,
        unreadableFiles: ['docs/a.md', 'docs/b.md'],
      },
      { format: 'table' },
      new Timer()
    );
    const printed = stderr.join('');
    expect(printed).toContain('Warning: Could not read file docs/a.md');
    expect(printed).toContain('Warning: Could not read file docs/b.md');
    expect(printed).toContain('Warning: Skipped 2 unreadable file(s); linting 1 file(s)');
  });

  it('prints the baseline counts before the result line', async () => {
    const { stderr } = captureLogger();
    await printLintRun(
      { status: 'completed', ...LINTED_REPORT, baseline: { matched: 2, new: 1, stale: 0 } },
      { format: 'table' },
      new Timer()
    );
    const printed = stderr.join('');
    const baselineAt = printed.indexOf('   Baseline: 2 matched, 1 new, 0 stale\n');
    expect(baselineAt).toBeGreaterThan(-1);
    expect(baselineAt).toBeLessThan(printed.indexOf('✅ No errors found!'));
  });

  it('prints a run with only warnings as a success and exits 0', async () => {
    const { stderr } = captureLogger();
    const code = await printLintRun(
      { status: 'completed', ...LINTED_REPORT, problems: [WARNING] },
      { format: 'table' },
      new Timer()
    );
    expect(code).toBe(0);
    const printed = stderr.join('');
    expect(printed).toContain('✅ No errors found!');
    expect(printed).toContain('   Found 1 warning(s) and info message(s).\n');
  });

  it('prints the fix report of a failed run before the error', async () => {
    const { stderr } = captureLogger();
    const code = await printLintRun(
      {
        status: 'failed',
        message: 'baseline file is not valid',
        report: { ...LINTED_REPORT, fixes: { applied: [FIX], skippedCount: 0 } },
      },
      { format: 'table' },
      new Timer()
    );
    expect(code).toBe(1);
    const printed = stderr.join('');
    const fixedAt = printed.indexOf('✅ Auto-fixed 1 issue(s)!');
    expect(fixedAt).toBeGreaterThan(-1);
    expect(fixedAt).toBeLessThan(
      printed.indexOf('💥 Error running recheck: baseline file is not valid')
    );
  });

  it('prints the files found before a missing baseline file and exits 1', async () => {
    const { stderr } = captureLogger();
    const code = await printLintRun(
      {
        status: 'baseline-missing',
        baselinePath: 'docs/.redocly.recheck-baseline.yaml',
        report: LINTED_REPORT,
      },
      { format: 'table' },
      new Timer()
    );
    expect(code).toBe(1);
    const printed = stderr.join('');
    const foundAt = printed.indexOf('   Found 2 markdown file(s)\n');
    expect(foundAt).toBeGreaterThan(-1);
    expect(foundAt).toBeLessThan(
      printed.indexOf('Baseline file not found: docs/.redocly.recheck-baseline.yaml')
    );
  });

  it('prints a report that cannot be written as a failed run and exits 1', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-print-'));
    try {
      const { stderr } = captureLogger();
      const code = await printLintRun(
        { status: 'completed', ...EMPTY_REPORT },
        { format: 'json', outputPath: path.join(dir, 'missing', 'report.json') },
        new Timer()
      );
      expect(code).toBe(1);
      expect(stderr.join('')).toContain('💥 Error running recheck: ENOENT');
      expect(stderr.join('')).toMatch(/ {3}Failed after \d+ms\n$/);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

describe('printLintRun report files', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recheck-print-files-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('writes the JSON report to the output path', async () => {
    const outputPath = path.join(tempDir, 'output.json');
    const { stderr, stdout } = captureLogger();
    const code = await printLintRun(
      { status: 'completed', ...LINTED_REPORT, problems: [ERROR] },
      { format: 'json', outputPath },
      new Timer()
    );
    expect(code).toBe(1);
    const report = JSON.parse(await fs.readFile(outputPath, 'utf8'));
    expect(report.summary.totalIssues).toBe(1);
    expect(report.issues[0].message).toBe('Line too long.');
    expect(stderr.join('')).toContain(`\n   Wrote JSON report to ${outputPath}\n`);
    expect(stdout).toEqual([]);
  });

  it('writes the SARIF report to the output path', async () => {
    const outputPath = path.join(tempDir, 'output.sarif');
    const { stderr, stdout } = captureLogger();
    const code = await printLintRun(
      { status: 'completed', ...LINTED_REPORT, problems: [ERROR] },
      { format: 'sarif', outputPath },
      new Timer()
    );
    expect(code).toBe(1);
    const sarif = JSON.parse(await fs.readFile(outputPath, 'utf8'));
    expect(sarif.runs[0].results).toHaveLength(1);
    expect(sarif.runs[0].results[0].message.text).toBe('Line too long.');
    expect(stderr.join('')).toContain(`\n   Wrote SARIF to ${outputPath}\n`);
    expect(stdout).toEqual([]);
  });

  it('writes the JSON summary to the summary path', async () => {
    const summaryPath = path.join(tempDir, 'summary.json');
    const { stderr } = captureLogger();
    const code = await printLintRun(
      { status: 'completed', ...LINTED_REPORT, problems: [WARNING] },
      { format: 'table', summary: 'json', summaryPath },
      new Timer()
    );
    expect(code).toBe(0);
    const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
    expect(summary.totalIssues).toBe(1);
    expect(summary.totalWarnings).toBe(1);
    expect(summary.breakdown['recheck/no-todos'].total).toBe(1);
    expect(stderr.join('')).toContain(`\n   Wrote summary to ${summaryPath}\n`);
  });

  it('caps the SARIF results with the annotations limit', async () => {
    const outputPath = path.join(tempDir, 'report.sarif');
    const problems = [5, 4, 3, 2, 1].map((line) => ({ ...ERROR, line }));
    const { stderr } = captureLogger();
    const code = await printLintRun(
      { status: 'completed', ...LINTED_REPORT, problems },
      { format: 'sarif', outputPath, annotationsLimit: 2 },
      new Timer()
    );
    expect(code).toBe(1);
    const sarif = JSON.parse(await fs.readFile(outputPath, 'utf8'));
    expect(
      sarif.runs[0].results.map(
        (result: { locations: { physicalLocation: { region: { startLine: number } } }[] }) =>
          result.locations[0].physicalLocation.region.startLine
      )
    ).toEqual([1, 2]);
    expect(stderr.join('')).toContain('\n   Annotations prepared: 2 (limit 2)\n');
  });
});

const READABILITY_RESULT: ReadabilityRunResult = {
  roots: ['docs'],
  filesFound: 1,
  unreadableFiles: [],
  rows: [
    {
      file: 'docs/index.md',
      words: 4,
      sentences: 1,
      fleschReadingEase: 97.03,
      fleschKincaidGrade: 0.72,
      automatedReadabilityIndex: -2.94,
    },
  ],
  summary: {
    files: 1,
    scored: 1,
    medianFleschReadingEase: 97.03,
    medianFleschKincaidGrade: 0.72,
    medianAutomatedReadabilityIndex: -2.94,
  },
};

describe('printReadabilityRun', () => {
  it('prints the table on stdout and the scored count on stderr', async () => {
    const { stderr, stdout } = captureLogger();
    const code = await printReadabilityRun(READABILITY_RESULT, { format: 'table' });
    expect(code).toBe(0);
    expect(stdout.join('')).toContain('   FRE     Grade     ARI   Words   Sentences  File\n');
    expect(stdout.join('')).toContain('docs/index.md\n');
    const printed = stderr.join('');
    expect(printed).toContain('📖 Measuring readability of: docs');
    expect(printed).toContain('   Scoring 1 markdown file(s)\n');
    expect(printed).toContain('1 of 1 file(s) scored');
  });

  it('prints the JSON report on stdout and no scored count', async () => {
    const { stderr, stdout } = captureLogger();
    const code = await printReadabilityRun(
      { ...READABILITY_RESULT, unreadableFiles: ['docs/secret.md'] },
      { format: 'json' }
    );
    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.summary.scored).toBe(1);
    expect(report.files[0].file).toBe('docs/index.md');
    const printed = stderr.join('');
    expect(printed).toContain('   Warning: Could not read file docs/secret.md');
    expect(printed).not.toContain('file(s) scored');
  });
});

const BASELINE_RESULT: BaselineRunResult = {
  roots: ['docs', 'guides'],
  filesFound: 2,
  unreadableFiles: [],
  outPath: '/project/.redocly.recheck-baseline.yaml',
  errorCount: 3,
  baselinedFileCount: 1,
  apiDescriptionCount: 0,
};

describe('printBaselineRun', () => {
  it('prints the roots, the written path, and the counts on stderr and exits 0', () => {
    const { stderr, stdout } = captureLogger();
    const code = printBaselineRun(BASELINE_RESULT);
    expect(code).toBe(0);
    expect(stdout).toEqual([]);
    expect(stderr).toEqual([
      `${cyan('📋 Building recheck baseline from: docs, guides')}\n`,
      '   Found 2 markdown file(s)\n',
      `${green('✅ Wrote /project/.redocly.recheck-baseline.yaml')}\n`,
      '   3 error finding(s) across 1 file(s) baselined.\n',
    ]);
  });

  it('prints a warning for each unreadable file before the written path', () => {
    const { stderr } = captureLogger();
    printBaselineRun({ ...BASELINE_RESULT, unreadableFiles: ['docs/a.md', 'docs/b.md'] });
    expect(stderr.slice(2, 5)).toEqual([
      `${yellow('   Warning: Could not read file docs/a.md')}\n`,
      `${yellow('   Warning: Could not read file docs/b.md')}\n`,
      `${green('✅ Wrote /project/.redocly.recheck-baseline.yaml')}\n`,
    ]);
  });

  it('names the API descriptions after the roots', () => {
    const { stderr } = captureLogger();
    printBaselineRun({ ...BASELINE_RESULT, apiDescriptionCount: 2 });
    expect(stderr[0]).toBe(
      `${cyan('📋 Building recheck baseline from: docs, guides, 2 API description(s)')}\n`
    );
  });

  it('names only the API descriptions when no root was requested', () => {
    const { stderr } = captureLogger();
    printBaselineRun({ ...BASELINE_RESULT, roots: [], apiDescriptionCount: 1 });
    expect(stderr[0]).toBe(`${cyan('📋 Building recheck baseline from: 1 API description(s)')}\n`);
  });
});
