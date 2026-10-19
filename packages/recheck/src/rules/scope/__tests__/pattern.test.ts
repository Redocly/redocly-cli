import { describe, it, expect } from 'vitest';

import { runRules } from '../../../core/runner.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule, PatternAssertion } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { pattern } from '../pattern.js';
import { buildWholeFileContext, expectInvalidOptions, expectValidOptions } from './helpers.js';

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

describe('pattern assertion', () => {
  it('does not match inside an inline code span by default', async () => {
    const problems = await runPattern('Run `git checkout master` first.', { tokens: ['master'] });
    expect(problems).toEqual([]);
  });

  // Masking replaces a code span with `\0` characters, which a negated class like `[^\s,]+` matches straight through. So matches are found on the original text and any match overlapping a code span is dropped.
  describe('range filtering for matches overlapping code spans', () => {
    it('does not report a negated-class match that would span a code span', async () => {
      // Masking would turn 'a`,`b' into one 5-character match for `[^\s,]+`, which spans the code span's comma.
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
    // A heading's content starts after the '## ', so the column needs the segment's start column.
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
    // Table cell content is trimmed, so the column must point at the real text and not at the '|'.
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

  // Line numbers, columns and reported text must be the same for LF, CRLF and CR files, with no '\r' in the text.
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

    // A wrapped paragraph's second sentence must be on line 2 for every line ending.
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

  // A pattern like 'a*' matches an empty string everywhere and must not hang the run. The timeout turns a hang into a failing test.
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

    // 'a+' cannot match an empty string, so real runs of 'a' are still reported.
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
    it.each<[string, unknown]>([
      ['includeCode: true', { tokens: ['foo'], includeCode: true }],
      ['tokens with boolean options', { tokens: ['foo', 'bar'], ignoreCase: true, nonword: false }],
    ])('accepts %s', async (_label, options) => {
      await expectValidOptions('pattern', options);
    });

    it.each<[string, unknown, ...string[]]>([
      ['a non-boolean includeCode', { tokens: ['foo'], includeCode: 'yes' }, 'includeCode'],
      ['an unknown option', { tokens: ['foo'], unknownOption: true }, 'unknownOption'],
      // A string would be iterated character by character at runtime.
      ['a string "tokens"', { tokens: 'ab' }, 'tokens', 'array'],
      ['an empty "tokens" array, which can never report anything', { tokens: [] }, 'tokens'],
      ['a "tokens" array with a non-string element', { tokens: ['foo', 42] }, 'tokens'],
      ['a missing "tokens"', { ignoreCase: true }, 'tokens'],
      // `ignoreCase: "yes"` is truthy, so a typo would silently turn on case-insensitive matching.
      ['a non-boolean ignoreCase', { tokens: ['foo'], ignoreCase: 'yes' }, 'ignoreCase'],
      ['a non-boolean nonword', { tokens: ['foo'], nonword: 'yes' }, 'nonword'],
    ])('rejects %s', async (_label, options, ...mentions) => {
      await expectInvalidOptions('pattern', options, ...mentions);
    });
  });
});
