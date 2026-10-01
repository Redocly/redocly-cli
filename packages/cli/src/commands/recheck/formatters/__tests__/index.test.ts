import type { Problem } from '@redocly/recheck';
import { stripVTControlCharacters } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { captureLogger } from '../../__tests__/capture-logger.js';
import { generateReport } from '../index.js';

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

const INFO: Problem = {
  ...ERROR,
  line: 2,
  ruleName: 'technical-english/passive-voice',
  severity: 'info',
  message: 'Prefer the active voice.',
};

function problem(overrides: Partial<Problem> = {}): Problem {
  return { ...ERROR, line: 1, ...overrides };
}

afterEach(() => vi.restoreAllMocks());

describe('generateReport', () => {
  it('prints the annotations count without the limit when no problem is prepared', () => {
    const { stderr, stdout } = captureLogger();

    generateReport([], 0, { format: 'sarif', maxProblems: 5 });

    expect(JSON.parse(stdout.join('')).runs[0].results).toEqual([]);
    expect(stderr).toEqual(['\n   Annotations prepared: 0\n']);
  });

  it('prints GitHub Actions annotations on stdout with errors first', () => {
    const { stderr, stdout } = captureLogger();

    generateReport([INFO, WARNING, { ...ERROR, message: 'a::b\nc' }], 1, {
      format: 'github-actions',
      maxProblems: 10,
    });

    expect(stdout).toEqual([
      '::error title=recheck/line-length,file=docs/index.md,line=5,endLine=5,col=1,endColumn=2::a::b%0Ac\n',
      '::warning title=recheck/no-todos,file=docs/index.md,line=1,endLine=1,col=1,endColumn=2::TODO found.\n',
      '::notice title=technical-english/passive-voice,file=docs/index.md,line=2,endLine=2,col=1,endColumn=2::Prefer the active voice.\n',
    ]);
    expect(stderr).toEqual(['\n   Annotations prepared: 3 (limit 10)\n']);
  });

  it('prints the JSON report with the baseline counts on stdout', () => {
    const { stdout } = captureLogger();
    const baseline = { matched: 1, new: 1, stale: 0 };

    generateReport([ERROR], 3, { format: 'json', baseline });

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

describe('generateReport with the table format', () => {
  const HIDDEN = 'more problems hidden > increase with `--max-problems N`\n';

  function plain(lines: string[]): string {
    return stripVTControlCharacters(lines.join(''));
  }

  it('counts every problem, prints the rows up to maxProblems, and reports the rest on stderr', () => {
    const { stderr, stdout } = captureLogger();

    generateReport([problem(), problem({ line: 2 })], 1, {
      format: 'table',
      maxProblems: 1,
    });

    const printed = plain(stdout);
    expect(printed).toContain('docs/index.md:1:1');
    expect(printed).not.toContain('docs/index.md:2:1');
    expect(printed).toContain('Found 2 issue(s):');
    expect(printed).toContain('\n   2 error(s)\n');
    expect(printed).not.toContain('more problems hidden');
    expect(plain(stderr)).toContain(`< ... 1 ${HIDDEN}`);
  });

  it('prints the counts and no rows when maxProblems is 0', () => {
    const { stderr, stdout } = captureLogger();

    generateReport([problem(), problem({ line: 2 })], 1, {
      format: 'table',
      maxProblems: 0,
    });

    const printed = plain(stdout);
    expect(printed).not.toContain('No issues found!');
    expect(printed).not.toContain('docs/index.md:');
    expect(printed).toContain('Found 2 issue(s):');
    expect(printed).toContain('\n   2 error(s)\n');
    expect(plain(stderr)).toContain(`< ... 2 ${HIDDEN}`);
  });

  it('prints every problem and no hidden count without maxProblems', () => {
    const { stderr, stdout } = captureLogger();

    generateReport([problem(), problem({ line: 2 })], 1, { format: 'table' });

    const printed = plain(stdout);
    expect(printed).toContain('docs/index.md:1:1');
    expect(printed).toContain('docs/index.md:2:1');
    expect(plain([...stdout, ...stderr])).not.toContain('more problems hidden');
  });
});
