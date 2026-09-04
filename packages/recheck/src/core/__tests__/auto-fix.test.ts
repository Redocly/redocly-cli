import { describe, expect, it } from 'vitest';

import type { Fix, NormalizedRule } from '../../types/index.js';
import { applyFixesToContent } from '../auto-fix.js';
import { runRules } from '../runner.js';

const fix = (partial: Partial<Fix>): Fix => ({
  file: 'f.md',
  ruleName: 'recheck/x',
  lineNumber: 1,
  ...partial,
});

// Most tests only care about the fixed content; classification tests below
// use the full { content, applied, skipped } result.
const apply = (content: string, fixes: Fix[]): string =>
  applyFixesToContent(content, fixes).content;

describe('applyFixesToContent', () => {
  it('deletes characters', () => {
    expect(apply('hello  \nworld\n', [fix({ lineNumber: 1, editColumn: 6, deleteCount: 2 })])).toBe(
      'hello\nworld\n'
    );
  });

  it('inserts text', () => {
    expect(apply('ab\n', [fix({ editColumn: 2, insertText: 'X' })])).toBe('aXb\n');
  });

  it('replaces text (delete + insert)', () => {
    expect(apply('colour\n', [fix({ editColumn: 1, deleteCount: 6, insertText: 'color' })])).toBe(
      'color\n'
    );
  });

  it('deletes a whole line with deleteCount -1', () => {
    expect(apply('one\ntwo\nthree\n', [fix({ lineNumber: 2, deleteCount: -1 })])).toBe(
      'one\nthree\n'
    );
  });

  it('replaces a whole line with deleteCount -1 and insertText', () => {
    expect(apply('one\ntwo\n', [fix({ lineNumber: 2, deleteCount: -1, insertText: 'TWO' })])).toBe(
      'one\nTWO\n'
    );
  });

  it('applies multiple fixes bottom-up so line numbers stay valid', () => {
    const fixes = [
      fix({ lineNumber: 1, editColumn: 1, deleteCount: 1, insertText: 'A' }),
      fix({ lineNumber: 3, deleteCount: -1 }),
    ];
    expect(apply('a\nb\nc\n', fixes)).toBe('A\nb\n');
  });

  it('applies rightmost-first within a line and skips overlapping fixes', () => {
    const fixes = [
      fix({ editColumn: 1, deleteCount: 3, insertText: 'XYZ' }),
      fix({ editColumn: 2, deleteCount: 3, insertText: 'OVERLAP' }), // overlaps cols 2-4
    ];
    const output = apply('abcdef\n', fixes);
    // Rightmost (col 2) applies first; the overlapping col-1 fix is skipped:
    expect(output).toBe('aOVERLAPef\n');
  });

  // Mirrors upstream markdownlint's applyFixes: input is split with
  // newLineRe (/\r\n?|\n/) and rejoined with the file's preferred line
  // ending (getPreferredLineEnding), so a CRLF file stays CRLF after --fix
  // and insertText '\n's are written using the file's own ending.
  describe('line endings', () => {
    it('preserves CRLF line endings on edits', () => {
      expect(
        apply('hello  \r\nworld\r\n', [fix({ lineNumber: 1, editColumn: 6, deleteCount: 2 })])
      ).toBe('hello\r\nworld\r\n');
    });

    it('writes insertText newlines using the file line ending (CRLF)', () => {
      expect(
        apply('One. Two.\r\nnext\r\n', [
          fix({ lineNumber: 1, deleteCount: -1, insertText: 'One.\nTwo.' }),
        ])
      ).toBe('One.\r\nTwo.\r\nnext\r\n');
    });

    it('writes insertText newlines using the file line ending (lone CR)', () => {
      expect(
        apply('x. Y.\rz\r', [fix({ lineNumber: 1, deleteCount: -1, insertText: 'x.\nY.' })])
      ).toBe('x.\rY.\rz\r');
    });

    it('deletes a whole line in a CRLF file without disturbing other endings', () => {
      expect(apply('one\r\ntwo\r\nthree\r\n', [fix({ lineNumber: 2, deleteCount: -1 })])).toBe(
        'one\r\nthree\r\n'
      );
    });

    it('normalizes mixed endings to the most common one (upstream getPreferredLineEnding)', () => {
      expect(apply('a\r\nb\r\nc \n', [fix({ lineNumber: 3, editColumn: 2, deleteCount: 1 })])).toBe(
        'a\r\nb\r\nc\r\n'
      );
    });
  });

  // Every input fix must land in exactly one of `applied`/`skipped`, so
  // callers (the runner, and through it the CLI's "Auto-fixed N" report)
  // can tell what actually changed the file apart from what was silently
  // dropped by overlap resolution.
  describe('applied vs skipped classification', () => {
    it('classifies the overlap loser as skipped and the winner as applied', () => {
      const loser = fix({ editColumn: 1, deleteCount: 3, insertText: 'XYZ' });
      const winner = fix({ editColumn: 2, deleteCount: 3, insertText: 'OVERLAP' });
      const result = applyFixesToContent('abcdef\n', [loser, winner]);
      expect(result.content).toBe('aOVERLAPef\n');
      expect(result.applied).toEqual([winner]);
      expect(result.skipped).toEqual([loser]);
    });

    it('classifies all fixes as applied when nothing overlaps', () => {
      const first = fix({ lineNumber: 1, editColumn: 1, deleteCount: 1, insertText: 'A' });
      const second = fix({ lineNumber: 3, deleteCount: -1 });
      const result = applyFixesToContent('a\nb\nc\n', [first, second]);
      expect(result.content).toBe('A\nb\n');
      expect(result.applied).toEqual([first, second]);
      expect(result.skipped).toEqual([]);
    });

    it('classifies an out-of-bounds fix as skipped', () => {
      const outOfBounds = fix({ lineNumber: 99, editColumn: 1, insertText: 'X' });
      const result = applyFixesToContent('one\n', [outOfBounds]);
      expect(result.content).toBe('one\n');
      expect(result.applied).toEqual([]);
      expect(result.skipped).toEqual([outOfBounds]);
    });

    it('classifies an exact duplicate as applied when its twin landed', () => {
      // Two rules proposing byte-identical edits: only one edit lands in
      // the content, but BOTH intents are satisfied — neither is "skipped".
      const twinA = fix({ editColumn: 6, deleteCount: 2 });
      const twinB = fix({ editColumn: 6, deleteCount: 2, ruleName: 'recheck/y' });
      const result = applyFixesToContent('hello  \nworld\n', [twinA, twinB]);
      expect(result.content).toBe('hello\nworld\n');
      expect(result.applied).toEqual([twinA, twinB]);
      expect(result.skipped).toEqual([]);
    });

    it('classifies a collapsed insert-only + delete-only pair at one position as applied', () => {
      // Upstream's collapse step merges these into a single replacement.
      const insertOnly = fix({ editColumn: 2, insertText: 'X' });
      const deleteOnly = fix({ editColumn: 2, deleteCount: 1 });
      const result = applyFixesToContent('abc\n', [insertOnly, deleteOnly]);
      expect(result.content).toBe('aXc\n');
      expect(result.applied).toEqual([insertOnly, deleteOnly]);
      expect(result.skipped).toEqual([]);
    });
  });
});

describe('fixable marking', () => {
  it('marks a token-rule finding that --fix would rewrite', async () => {
    const rule: NormalizedRule = {
      name: 'recheck/no-trailing-spaces',
      shortName: 'no-trailing-spaces',
      severity: 'error',
      message: 'Remove trailing spaces.',
      scope: 'all',
      assertions: { 'no-trailing-spaces': {} },
    };

    const { problems } = await runRules([{ path: 'a.md', content: 'text   \n' }], [rule]);
    expect(problems).toHaveLength(1);
    expect(problems[0].fixable).toBe(true);
  });

  it('does not mark it when the rule has fix disabled', async () => {
    const rule: NormalizedRule = {
      name: 'recheck/no-trailing-spaces',
      shortName: 'no-trailing-spaces',
      severity: 'error',
      message: 'Remove trailing spaces.',
      scope: 'all',
      fix: false,
      assertions: { 'no-trailing-spaces': {} },
    };

    const { problems } = await runRules([{ path: 'a.md', content: 'text   \n' }], [rule]);
    expect(problems[0].fixable).toBe(false);
  });

  it('marks a scope-rule finding on the same terms', async () => {
    const rule: NormalizedRule = {
      name: 'test/cap',
      shortName: 'cap',
      severity: 'error',
      message: '"%s" should use %s capitalization.',
      scope: 'heading',
      assertions: { capitalization: { match: '$sentence' } },
    };

    const { problems } = await runRules(
      [{ path: 'a.md', content: '## The Great Escape\n' }],
      [rule]
    );
    expect(problems).toHaveLength(1);
    expect(problems[0].fixable).toBe(true);
  });
});

describe('fixable marking narrows to what --fix can repair', () => {
  it('a custom-regex capitalization finding is not marked, though the rule can fix', async () => {
    const rule: NormalizedRule = {
      name: 'test/cap-regex',
      shortName: 'cap-regex',
      severity: 'error',
      message: 'Heading must match the pattern.',
      scope: 'heading',
      assertions: { capitalization: { match: '^[A-Z]' } },
    };

    const { problems } = await runRules(
      [{ path: 'a.md', content: '## lowercase heading\n' }],
      [rule]
    );
    expect(problems).toHaveLength(1);
    expect(problems[0].fixable).toBe(false);
  });

  it('a consistency pair with different word counts is not marked', async () => {
    const rule: NormalizedRule = {
      name: 'test/consistency',
      shortName: 'consistency',
      severity: 'error',
      message: 'Use "%s" consistently (found "%s").',
      scope: 'paragraph',
      assertions: { consistency: { either: { "it's": 'it is' } } },
    };

    // "it is" is seen first and wins; the "it's" finding cannot be fixed
    // because the replacement crosses a word-count boundary.
    const content = "Say it is fine today, because later it's been growing.\n";
    const { problems } = await runRules([{ path: 'a.md', content }], [rule]);
    expect(problems).toHaveLength(1);
    expect(problems[0].fixable).toBe(false);
  });
});
