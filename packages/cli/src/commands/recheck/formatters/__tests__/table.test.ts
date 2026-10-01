import type { Problem } from '@redocly/recheck';
import { stripVTControlCharacters } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { captureLogger } from '../../__tests__/capture-logger.js';
import { outputTableFormat } from '../table.js';

function problem(overrides: Partial<Problem> = {}): Problem {
  return {
    file: 'docs/index.md',
    line: 1,
    column: 1,
    text: '',
    match: '',
    ruleName: 'recheck/line-length',
    severity: 'error',
    message: 'Line too long.',
    ...overrides,
  };
}

afterEach(() => vi.restoreAllMocks());

describe('outputTableFormat', () => {
  it('prints the rule breakdown, largest first, when stats are on', () => {
    const { stdout } = captureLogger();

    outputTableFormat(
      [
        problem({ severity: 'warn', ruleName: 'recheck/no-todos' }),
        problem(),
        problem({ line: 2, severity: 'info' }),
      ],
      2,
      true
    );

    const printed = stripVTControlCharacters(stdout.join(''));
    expect(printed).toContain('\n📊 Summary Statistics:\n');
    expect(printed).toContain('   2 markdown file(s) scanned\n   3 total issue(s) detected\n');
    expect(printed).toContain(
      '\n   Breakdown by rule:\n   line-length: 2 (1 error, 1 info)\n   no-todos: 1 (1 warning)\n'
    );
  });

  it('prints the scanned file count of a clean run when stats are on', () => {
    const { stdout } = captureLogger();

    outputTableFormat([], 4, true);

    expect(stripVTControlCharacters(stdout.join(''))).toBe(
      '\n🎉 No issues found!\n\n📊 Summary: 4 file(s) scanned, 0 issues found.\n'
    );
  });
});
