import { logger } from '@redocly/openapi-core';
import { Timer, type LintRunReport } from '@redocly/recheck';
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
      { status: 'failed', message: 'baseline file is not valid' },
      { format: 'table' },
      new Timer()
    );
    expect(code).toBe(1);
    expect(stderr.join('')).toContain('💥 Error running recheck: baseline file is not valid');
    expect(stderr.join('')).toMatch(/ {3}Failed after \d+ms\n$/);
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
