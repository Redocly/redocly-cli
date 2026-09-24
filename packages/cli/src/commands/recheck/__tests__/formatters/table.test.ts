import type { Problem } from '@redocly/recheck';
import { stripVTControlCharacters } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { outputTableFormat } from '../../formatters/table.js';
import { captureLogger } from '../capture-logger.js';

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
  it('marks a fixable finding with [fixable] and counts the fixable findings', () => {
    const { stderr, stdout } = captureLogger();

    outputTableFormat([problem({ fixable: true }), problem({ line: 2 })], 1, false);

    const printed = stripVTControlCharacters(stdout.join(''));
    expect(printed).toContain('docs/index.md:1:1');
    expect(printed).toContain('Line too long. [fixable]\n');
    expect(printed).toContain('\n   1 of 2 fixable with --fix\n');
    expect(printed).toContain('\n   2 error(s)\n');
    expect(stderr).toEqual([]);
  });

  it('does not mark or count a fixable description finding, since --fix cannot rewrite it', () => {
    const { stdout } = captureLogger();

    outputTableFormat([problem({ fixable: true, pointer: '#/info/description' })], 1, false);

    const printed = stripVTControlCharacters(stdout.join(''));
    expect(printed).toContain('Line too long.\n');
    expect(printed).not.toContain('[fixable]');
    expect(printed).not.toContain('fixable with --fix');
  });

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
