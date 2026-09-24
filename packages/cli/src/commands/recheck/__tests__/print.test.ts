import { logger } from '@redocly/openapi-core';
import { Timer, type Fix, type LintRunReport, type Problem } from '@redocly/recheck';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { printLintRun } from '../print.js';

function captureLogger() {
  const stderr: string[] = [];
  const stdout: string[] = [];
  vi.spyOn(logger, 'info').mockImplementation((line) => void stderr.push(line));
  vi.spyOn(logger, 'warn').mockImplementation((line) => void stderr.push(line));
  vi.spyOn(logger, 'error').mockImplementation((line) => void stderr.push(line));
  vi.spyOn(logger, 'output').mockImplementation((line) => void stdout.push(line));
  return { stderr, stdout };
}

const EMPTY_REPORT: LintRunReport = {
  roots: ['docs'],
  ruleCount: 3,
  disabledRuleCount: 0,
  filesFound: 0,
  unreadableFiles: [],
  scannedFileCount: 0,
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
        roots: ['docs'],
        ruleCount: 3,
        disabledRuleCount: 0,
        filesFound: 1,
        unreadableFiles: [],
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
