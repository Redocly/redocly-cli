import { buildSummary, type Problem } from '@redocly/recheck';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { captureLogger } from '../../__tests__/capture-logger.js';
import { printSummary } from '../summary.js';

const ERROR: Problem = {
  file: 'docs/index.md',
  line: 5,
  column: 1,
  text: '',
  match: '',
  ruleName: 'recheck/line-length',
  severity: 'error',
  message: 'Line too long.',
};

const WARNING: Problem = {
  ...ERROR,
  line: 1,
  ruleName: 'recheck/no-todos',
  severity: 'warn',
  message: 'TODO found.',
};

afterEach(() => vi.restoreAllMocks());

describe('printSummary', () => {
  it('prints a text summary on stderr', async () => {
    const { stderr, stdout } = captureLogger();

    await printSummary(buildSummary([ERROR, WARNING], 2), 'text', undefined);

    expect(stderr.join('')).toBe(
      '\nFiles scanned: 2\n' +
        'Total issues: 2\n' +
        'Errors: 1, Warnings: 1, Info: 0\n' +
        '\n' +
        'Breakdown by rule:\n' +
        'recheck/line-length: 1 (errors: 1, warnings: 0, info: 0)\n' +
        'recheck/no-todos: 1 (errors: 0, warnings: 1, info: 0)\n'
    );
    expect(stdout).toEqual([]);
  });
});
