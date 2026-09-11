import { describe, it, expect } from 'vitest';

import { validate } from '../../../config/validate.js';
import { runRules } from '../../../core/runner.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule, PatternAssertion } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { pattern } from '../pattern.js';
import { buildWholeFileContext } from './helpers.js';

describe('pattern assertion', () => {
  // Task 1 (Phase 4): prose rules must not lint code -- a token like
  // 'master' would otherwise fire inside `git checkout master`, the usage
  // Google's style guide explicitly sanctions in code font. Default
  // behavior masks inline code spans before scanning; `includeCode: true`
  // opts back into scanning them.
  describe('includeCode option (inline-code masking)', () => {
    async function runPattern(content: string, options: PatternAssertion) {
      const rule: NormalizedRule = {
        name: 'test-pattern',
        shortName: 'pattern',
        severity: 'error',
        message: "Found '%s'.",
        scope: 'all',
        assertions: { pattern: options },
      };
      return pattern.execute(rule, 'test.md', buildWholeFileContext(content));
    }

    it('does not match inside an inline code span by default', async () => {
      const problems = await runPattern('Run `git checkout master` first.', {
        tokens: ['master'],
      });
      expect(problems).toEqual([]);
    });

    it('still matches the same word outside a code span', async () => {
      const problems = await runPattern('The master branch, see `master`.', {
        tokens: ['master'],
      });
      expect(problems).toHaveLength(1);
      expect(problems[0].column).toBe(5);
    });

    it('matches inside code when includeCode is true', async () => {
      const problems = await runPattern('Run `git checkout master`.', {
        tokens: ['master'],
        includeCode: true,
      });
      expect(problems).toHaveLength(1);
    });
  });

  // Task 1 (Phase 4), fix wave 1: masking substitutes a same-length run of
  // `\0` for a code span's real characters, and `\0` is not whitespace or
  // a comma. A negated class like `[^\s,]+` (the live root-config
  // `recheck/oxford-comma` rule's token) treats that run as ordinary
  // "not comma, not whitespace" text and matches straight through it,
  // merging text before and after the span -- including the comma the
  // class exists to react to -- into one bogus match. Range filtering
  // (running the regex against the unmodified content, then discarding any
  // match whose span overlaps a code span) has no such hole.
  describe('range filtering for matches overlapping code spans (Task 1 fix wave 1)', () => {
    async function runPattern(content: string, options: PatternAssertion) {
      const rule: NormalizedRule = {
        name: 'test-pattern',
        shortName: 'pattern',
        severity: 'error',
        message: "Found '%s'.",
        scope: 'all',
        assertions: { pattern: options },
      };
      return pattern.execute(rule, 'test.md', buildWholeFileContext(content));
    }

    it('does not report a negated-class match that would span a code span', async () => {
      // Masking turns 'a`,`b' into 'a\0\0\0b'; [^\s,]+ matches that whole
      // run as ONE match (index 0, length 5), reporting 'a`,`b' verbatim --
      // a match that spans straight through the code span's own comma.
      const problems = await runPattern('a`,`b', { tokens: ['[^\\s,]+'] });
      expect(problems).toEqual([]);
    });

    it('still reports a match adjacent to (not overlapping) a code span', async () => {
      const problems = await runPattern('foo`bar`baz', { tokens: ['foo', 'baz'] });
      expect(problems).toHaveLength(2);
      expect(problems.map((p) => p.match)).toEqual(['foo', 'baz']);
    });

    it('still reports the negated-class match when includeCode is true', async () => {
      const problems = await runPattern('a`,`b', {
        tokens: ['[^\\s,]+'],
        includeCode: true,
      });
      expect(problems.map((p) => p.match)).toEqual(['a`', '`b']);
    });
  });

  it('should handle empty content without throwing', async () => {
    const rule: NormalizedRule = {
      name: 'test-pattern',
      shortName: 'pattern',
      severity: 'error',
      message: 'Test message',
      scope: 'all',
      assertions: {
        pattern: {
          tokens: ['test'],
        },
      },
    };

    const file = 'empty.md';
    const context = buildWholeFileContext('');

    const problems = await pattern.execute(rule, file, context);
    expect(problems).toEqual([]);
  });

  it("reports the true column for a match on a heading segment's first line", async () => {
    // Regression for FIX 6(c): see the equivalent swap.test.ts case — a
    // heading segment's content excludes the '## ' marker, so its
    // startColumn (4 here) must be added when the match is on the
    // segment's first line.
    const content = '## Getting started\n';
    const rule: NormalizedRule = {
      name: 'test-pattern',
      shortName: 'pattern',
      severity: 'error',
      message: 'No gerunds.',
      scope: 'heading',
      assertions: {
        pattern: { tokens: ['^Getting'] },
      },
    };

    const tree = parseMarkdown(content);
    const segments = extractScopes(tree, content).filter((s) => s.scope === 'heading.h2');
    const context: ScopeRuleContext = { segments, content, tree };

    const problems = await pattern.execute(rule, 'test.md', context);

    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    // 'Getting' starts at source column 4 ('## '.length + 1).
    expect(problems[0].column).toBe(4);
  });

  it('reports the true column for a match in a padded table cell', async () => {
    // Regression (Bugbot): table cell segments carried trimmed content but
    // the full cell token's startColumn (at the leading '|'), so pattern
    // matches in padded cells reported a column left of the real text.
    const content = '| word   | colour |\n| ------ | ------ |\n| padded |  colour here |\n';
    const rule: NormalizedRule = {
      name: 'test-pattern',
      shortName: 'pattern',
      severity: 'error',
      message: 'Avoid %s.',
      scope: 'table.cell',
      assertions: {
        pattern: { tokens: ['colour'] },
      },
    };

    const { problems } = await runRules([{ path: 't.md', content }], [rule]);

    // Body cell '  colour here ': 'colour' starts at source column 13, and
    // the reported text is the cell's trimmed content line.
    expect(problems.map((p) => [p.line, p.column, p.match, p.text])).toEqual([
      [3, 13, 'colour', 'colour here'],
    ]);
  });

  it('substitutes %s in the message with the matched text', async () => {
    const content = 'TODO later\n';
    const rule: NormalizedRule = {
      name: 'test-pattern',
      shortName: 'pattern',
      severity: 'error',
      message: "Found '%s'.",
      scope: 'all',
      assertions: {
        pattern: { tokens: ['TODO'] },
      },
    };

    const context = buildWholeFileContext(content);
    const problems = await pattern.execute(rule, 'test.md', context);

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe("Found 'TODO'.");
  });

  // Regression (Bugbot): execute() computed line/column with a bare '\n'
  // split / lastIndexOf('\n') and pulled the reported `text` from a bare
  // '\n' split too. On CR-only files, matches landed on the wrong line
  // (line 1, column counted from the start of the file); on CRLF files,
  // the reported `text` kept a trailing '\r'. Positions and reported text
  // must be identical across LF / CRLF / CR twins, with no '\r' anywhere
  // in reported text.
  describe('line-ending-aware position mapping', () => {
    const todoRule: NormalizedRule = {
      name: 'test-pattern',
      shortName: 'pattern',
      severity: 'error',
      message: "Found '%s'.",
      scope: 'all',
      assertions: {
        pattern: { tokens: ['TODO'] },
      },
    };

    for (const [label, ending] of [
      ['LF', '\n'],
      ['CRLF', '\r\n'],
      ['CR', '\r'],
    ] as const) {
      it(`reports 2:1 with '\\r'-free text on a ${label} file`, async () => {
        const content = `First line here${ending}TODO something${ending}`;
        const context = buildWholeFileContext(content);
        const problems = await pattern.execute(todoRule, 'test.md', context);

        expect(problems.map((problem) => [problem.line, problem.column])).toEqual([[2, 1]]);
        expect(problems[0].text).toBe('TODO something');
      });
    }

    // Sentence-scoped runs exercise the extractor's own sentence-position
    // mapping: a soft-wrapped paragraph's second sentence must map to
    // line 2 regardless of the file's line endings (previously, on a
    // CR-only file, it stayed on line 1 with a column counted through
    // the CR).
    const sentenceScopedRule: NormalizedRule = {
      name: 'test-pattern',
      shortName: 'pattern',
      severity: 'error',
      message: "Found '%s'.",
      scope: 'sentence',
      assertions: {
        pattern: { tokens: ['TODO'] },
      },
    };

    for (const [label, ending] of [
      ['LF', '\n'],
      ['CRLF', '\r\n'],
      ['CR', '\r'],
    ] as const) {
      it(`maps a sentence-scoped match on a soft-wrapped paragraph's second line (${label})`, async () => {
        const content = `First sentence here.${ending}Second TODO here.${ending}`;
        const { problems } = await runRules([{ path: 't.md', content }], [sentenceScopedRule]);
        expect(problems.map((problem) => [problem.line, problem.column])).toEqual([[2, 8]]);
      });
    }
  });

  // Critical Bugbot finding: unlike swap/conditional/repetition, `pattern`'s
  // exec loop had NO zero-width guard at all -- a user `tokens` entry like
  // 'a*' matches '' at every offset without ever advancing lastIndex, so
  // exec() keeps returning the same zero-length match forever and the
  // process hangs. A 2000ms per-test timeout turns that hang into a fast,
  // legible failure instead of stalling the whole suite.
  describe('zero-width `tokens` pattern (defense against a hanging exec loop)', () => {
    const zeroWidthRule: NormalizedRule = {
      name: 'test-pattern',
      shortName: 'pattern',
      severity: 'error',
      message: "Found '%s'.",
      scope: 'all',
      assertions: {
        pattern: { tokens: ['a*'] },
      },
    };

    it('reports zero problems for a zero-width-only token (no literal "a" in the text)', async () => {
      const { problems } = await runRules(
        [{ path: 't.md', content: 'bbb here\n' }],
        [zeroWidthRule]
      );
      expect(problems).toEqual([]);
    }, 2000);

    // Guard must not swallow GENUINE findings: 'a+' can never match
    // zero-width, so every real run of 'a' characters is still reported.
    it('still reports real matches for a token that can never be zero-width (a+)', async () => {
      const realMatchRule: NormalizedRule = {
        ...zeroWidthRule,
        assertions: { pattern: { tokens: ['a+'] } },
      };
      const { problems } = await runRules(
        [{ path: 't.md', content: 'aaa bbb\n' }],
        [realMatchRule]
      );
      expect(problems.map((p) => p.match)).toEqual(['aaa']);
    }, 2000);
  });

  describe('validation', () => {
    function patternConfig(options: unknown) {
      return {
        'recheck/test-rule': {
          severity: 'error',
          message: 'Test message',
          assertions: { pattern: options },
        },
      };
    }

    it('rejects a non-boolean includeCode', async () => {
      const result = await validate(patternConfig({ tokens: ['foo'], includeCode: 'yes' }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('includeCode'))).toBe(true);
    });

    it('still accepts a pattern assertion with includeCode: true', async () => {
      const result = await validate(patternConfig({ tokens: ['foo'], includeCode: true }));

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects an unknown pattern option', async () => {
      const result = await validate(patternConfig({ tokens: ['foo'], unknownOption: true }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('unknownOption'))).toBe(true);
    });

    // Final-review fix (Item 4): the brief's exact repro -- `tokens: "ab"`
    // (a string, not an array) used to validate clean, then pattern.ts's
    // `for (const token of tokens)` iterated the string CHARACTER BY
    // CHARACTER, compiling 'a' and 'b' as separate single-letter patterns
    // (five findings for single letters instead of one for "ab").
    it('rejects a string "tokens" (iterates character by character at runtime otherwise)', async () => {
      const result = await validate(patternConfig({ tokens: 'ab' }));

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (error) => error.message.includes('tokens') && error.message.includes('array')
        )
      ).toBe(true);
    });

    it('rejects an empty "tokens" array (can never report anything)', async () => {
      const result = await validate(patternConfig({ tokens: [] }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('tokens'))).toBe(true);
    });

    it('rejects a "tokens" array containing a non-string element', async () => {
      const result = await validate(patternConfig({ tokens: ['foo', 42] }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('tokens'))).toBe(true);
    });

    it('rejects a missing "tokens"', async () => {
      const result = await validate(patternConfig({ ignoreCase: true }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('tokens'))).toBe(true);
    });

    // The brief's exact repro: `ignoreCase: "yes"` is truthy, so a typo
    // silently flips case-sensitivity at runtime instead of being rejected.
    it('rejects a non-boolean ignoreCase', async () => {
      const result = await validate(patternConfig({ tokens: ['foo'], ignoreCase: 'yes' }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('ignoreCase'))).toBe(true);
    });

    it('rejects a non-boolean nonword', async () => {
      const result = await validate(patternConfig({ tokens: ['foo'], nonword: 'yes' }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('nonword'))).toBe(true);
    });

    it('still accepts a well-formed pattern assertion (tokens array, boolean options)', async () => {
      const result = await validate(
        patternConfig({ tokens: ['foo', 'bar'], ignoreCase: true, nonword: false })
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
