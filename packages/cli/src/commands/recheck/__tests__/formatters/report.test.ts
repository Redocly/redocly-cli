import { buildSummary, type Problem } from '@redocly/recheck';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateReport } from '../../formatters/index.js';
import { printSummary } from '../../formatters/summary.js';
import { captureLogger } from '../capture-logger.js';

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

describe('generateReport', () => {
  it('prints the annotations count without the limit when no problem is prepared', async () => {
    const { stderr, stdout } = captureLogger();

    await generateReport([], 0, { format: 'sarif', annotationsLimit: 5 });

    expect(JSON.parse(stdout.join('')).runs[0].results).toEqual([]);
    expect(stderr).toEqual(['\n   Annotations prepared: 0\n']);
  });

  it('prints GitHub Actions annotations on stdout with errors first', async () => {
    const { stderr, stdout } = captureLogger();

    await generateReport([WARNING, { ...ERROR, message: 'a::b\nc' }], 1, {
      format: 'github-actions',
      annotationsLimit: 10,
    });

    expect(stdout).toEqual([
      '::error title=recheck/line-length,file=docs/index.md,line=5,endLine=5,col=1,endColumn=2::a%3A%3Ab%0Ac\n',
      '::warning title=recheck/no-todos,file=docs/index.md,line=1,endLine=1,col=1,endColumn=2::TODO found.\n',
    ]);
    expect(stderr).toEqual(['\n   Annotations prepared: 2 (limit 10)\n']);
  });

  it('prints the JSON report with the baseline counts on stdout', async () => {
    const { stdout } = captureLogger();
    const baseline = { matched: 1, new: 1, stale: 0 };

    await generateReport([ERROR], 3, { format: 'json', baseline });

    expect(stdout).toHaveLength(1);
    expect(stdout[0].endsWith('}\n')).toBe(true);
    expect(JSON.parse(stdout[0])).toEqual({
      summary: {
        filesScanned: 3,
        totalIssues: 1,
        baseline,
        breakdown: { 'recheck/line-length': { errors: 1, warnings: 0, info: 0, total: 1 } },
      },
      issues: [ERROR],
    });
  });
});

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
