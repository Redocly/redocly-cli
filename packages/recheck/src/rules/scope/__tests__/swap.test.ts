import { describe, it, expect } from 'vitest';

import { runRules, runRulesUntilStable } from '../../../core/runner.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule, SwapAssertion } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { swap } from '../swap.js';
import { buildWholeFileContext, expectInvalidOptions, expectValidOptions } from './helpers.js';

function swapRule(options: SwapAssertion, scope: string | string[] = 'all'): NormalizedRule {
  return {
    name: 'test-swap',
    shortName: 'swap',
    severity: 'error',
    message: 'Use %s instead of %s.',
    scope,
    assertions: { swap: options },
  };
}

async function runSwap(content: string, options: SwapAssertion) {
  return swap.execute(swapRule(options), 'test.md', buildWholeFileContext(content));
}

describe('swap assertion', () => {
  it('does not match inside an inline code span by default', async () => {
    const problems = await runSwap('Run `git checkout master` first.', {
      pairs: { master: 'primary' },
    });
    expect(problems).toEqual([]);
  });

  // Masking replaces a code span with `\0` characters, which a negated class like `[^\s,]+` matches straight through. So matches are found on the original text and any match overlapping a code span is dropped.
  describe('range filtering for matches overlapping code spans', () => {
    it('does not report a negated-class-key match that would span a code span', async () => {
      // Masking would turn 'a`,`b' into one 5-character match for `[^\s,]+`, which spans the code span's comma.
      const problems = await runSwap('a`,`b', {
        pairs: { '[^\\s,]+': 'X' },
        keysAreRegex: true,
      });
      expect(problems).toEqual([]);
    });

    it('still reports a match adjacent to (not overlapping) a code span', async () => {
      const problems = await runSwap('foo`bar`baz', {
        pairs: { foo: 'FOO', baz: 'BAZ' },
      });
      expect(problems).toHaveLength(2);
      expect(problems.map((p) => p.match)).toEqual(['foo', 'baz']);
    });

    it('still reports the negated-class-key match when includeCode is true', async () => {
      const problems = await runSwap('a`,`b', {
        pairs: { '[^\\s,]+': 'X' },
        keysAreRegex: true,
        includeCode: true,
      });
      expect(problems.map((p) => p.match)).toEqual(['a`', '`b']);
    });
  });

  it('should handle empty content without throwing', async () => {
    expect(await runSwap('', { pairs: { old: 'new' } })).toEqual([]);
  });

  it("reports the true column for a match on a heading segment's first line", async () => {
    // A heading's content starts after the '## ', so the column needs the segment's start column.
    const content = '## Heading colour\n';
    const tree = parseMarkdown(content);
    const segments = extractScopes(tree, content).filter((s) => s.scope === 'heading.h2');
    const context: ScopeRuleContext = { segments, content, tree };

    const problems = await swap.execute(
      swapRule({ pairs: { colour: 'color' } }, 'heading'),
      'test.md',
      context
    );

    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    // 'colour' starts at source column 12 ('## Heading '.length + 1).
    expect(problems[0].column).toBe(12);
  });

  // Table cell content is trimmed, so the column must point at the real text and not at the '|'. --fix must replace only the matched word.
  describe('table cell segments: trimmed content maps to true source columns', () => {
    const padded = '| word   | colour |\n| ------ | ------ |\n| padded |  colour here |\n';

    it.each<[string, string, string | string[], [line: number, column: number], string]>([
      [
        'a padded body cell',
        padded,
        'table.cell',
        [3, 13],
        '| word   | colour |\n| ------ | ------ |\n| padded |  color here |\n',
      ],
      [
        'a padded header cell',
        padded,
        'table.header',
        [1, 12],
        '| word   | color |\n| ------ | ------ |\n| padded |  colour here |\n',
      ],
      [
        'the start of an unpadded cell',
        '|word|x|\n|-|-|\n|colour|y|\n',
        'table.cell',
        [3, 2],
        '|word|x|\n|-|-|\n|color|y|\n',
      ],
      [
        // 'a😀b ' is 5 UTF-16 code units ('😀' is an astral pair).
        'a header cell with multi-byte text before the match',
        '| a😀b colour | z |\n| ----------- | - |\n| x | y |\n',
        'table.header',
        [1, 8],
        '| a😀b color | z |\n| ----------- | - |\n| x | y |\n',
      ],
      [
        'a header and a body cell together',
        padded,
        ['table.header', 'table.cell'],
        [1, 12],
        '| word   | color |\n| ------ | ------ |\n| padded |  color here |\n',
      ],
    ])(
      'reports the true column and fixes only the word in %s',
      async (_label, content, scope, [line, column], expected) => {
        const rule = swapRule({ pairs: { colour: 'color' } }, scope);

        const { problems, fixedFiles } = await runRules([{ path: 't.md', content }], [rule], {
          fix: true,
        });
        expect(problems.map((p) => [p.line, p.column, p.match])[0]).toEqual([
          line,
          column,
          'colour',
        ]);
        expect(fixedFiles.get('t.md')).toBe(expected);

        const relint = await runRules([{ path: 't.md', content: expected }], [rule]);
        expect(relint.problems).toEqual([]);
      }
    );
  });

  // Line numbers, columns and fixes must be the same for LF, CRLF and CR files, and line endings must be kept.
  describe('line-ending-aware position mapping', () => {
    it.each([
      ['LF', '\n'],
      ['CRLF', '\r\n'],
      ['CR', '\r'],
    ])('reports 2:5 and fixes in place on a %s file', async (_label, ending) => {
      const content = `Heading line one.${ending}Use colour here.${ending}`;
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content }],
        [swapRule({ pairs: { colour: 'color' } })],
        { fix: true }
      );
      expect(problems.map((problem) => [problem.line, problem.column])).toEqual([[2, 5]]);
      expect(fixedFiles.get('t.md')).toBe(`Heading line one.${ending}Use color here.${ending}`);
    });
  });

  // An empty pair key must not hang the scan, even if validate() was skipped. The timeout makes a hang fail the test.
  describe('zero-width match guard (defense in depth against an empty pair key)', () => {
    it(
      'completes without hanging and reports no problems for an empty key, even bypassing validate()',
      { timeout: 2000 },
      async () => {
        const { problems } = await runRules(
          [{ path: 'test.md', content: 'Use colour here.\n' }],
          [swapRule({ pairs: { '': 'x' } })]
        );

        expect(problems).toEqual([]);
      }
    );
  });

  // With `ignoreCase`, the fix keeps the casing of the matched text, so 'Behaviour' becomes 'Behavior', not 'behavior'.
  describe('case-preserving fixes (ignoreCase)', () => {
    it.each([
      ['Behaviour matters. behaviour too.\n', 'Behavior matters. behavior too.\n'],
      ['BEHAVIOUR matters.\n', 'BEHAVIOR matters.\n'],
    ])('fixes %j to %j', async (content, expected) => {
      const rule = swapRule({ pairs: { behaviour: 'behavior' }, ignoreCase: true });

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [rule], { fix: true });
      expect(fixedFiles.get('t.md')).toBe(expected);

      const relint = await runRules([{ path: 't.md', content: expected }], [rule]);
      expect(relint.problems).toEqual([]);
    });
  });

  describe('keysAreRegex', () => {
    const regexSwapRule = (pairs: Record<string, string>, extra = {}) =>
      swapRule({ keysAreRegex: true, pairs, ...extra });

    it('compiles a regex KEY (suffix group) that matches and fixes', async () => {
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content: 'The blacklisted entry.\n' }],
        [regexSwapRule({ 'blacklist(?:ed|ing|s)?': 'blocklist' }, { wordBoundary: true })],
        { fix: true }
      );
      expect(problems.map((problem) => problem.match)).toEqual(['blacklisted']);
      expect(fixedFiles.get('t.md')).toBe('The blocklist entry.\n');
    });

    // An invalid regex key must be ignored, so the valid `colour` pair is still reported.
    it('no-ops an invalid regex KEY while other pairs still match and fix', async () => {
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content: 'A colour here.\n' }],
        [regexSwapRule({ '[invalid': 'x', colour: 'color' })],
        { fix: true }
      );
      expect(problems.map((problem) => problem.match)).toEqual(['colour']);
      expect(fixedFiles.get('t.md')).toBe('A color here.\n');
    });

    // A regex key that can match nothing must not hang the scan. The timeout makes a hang fail the test.
    it(
      'completes without hanging for a zero-width-capable regex key',
      { timeout: 2000 },
      async () => {
        const problems = await swap.execute(
          regexSwapRule({ 'a*': 'x' }),
          't.md',
          buildWholeFileContext('ba')
        );
        // The empty matches at offsets 0 and 2 are skipped; only the real 'a' at offset 1 is reported.
        expect(problems).toHaveLength(1);
        expect(problems[0].match).toBe('a');
      }
    );

    // An empty match must not be reported, or --fix would insert text at every position.
    it('reports zero problems and zero fixes for a zero-width-only match (no `a` in the text)', async () => {
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content: 'bbb here\n' }],
        [regexSwapRule({ 'a*': 'x' }, { wordBoundary: false })],
        { fix: true }
      );
      expect(problems).toEqual([]);
      expect(fixedFiles.size).toBe(0);
    });

    // 'a+' cannot match an empty string, so real runs of 'a' are still reported and fixed.
    it('still reports and fixes real matches for a pattern that can never be zero-width (a+)', async () => {
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content: 'aaa here\n' }],
        [regexSwapRule({ 'a+': 'x' })],
        { fix: true }
      );
      expect(problems.map((p) => p.match)).toEqual(['aaa']);
      expect(fixedFiles.get('t.md')).toBe('x here\n');
    });

    // A second pass over fixed content must find nothing more.
    it('is idempotent under runRulesUntilStable for a zero-width-capable pattern', async () => {
      const content = 'aaa here, also a and bbb.\n';
      const rule = regexSwapRule({ 'a*': 'x' }, { wordBoundary: false });
      const first = await runRulesUntilStable([{ path: 't.md', content }], [rule]);
      const second = await runRulesUntilStable(
        [{ path: 't.md', content: first.fixedFiles.get('t.md') ?? content }],
        [rule]
      );
      expect(second.problems).toEqual([]);
      expect(second.fixedFiles.size).toBe(0);
    });
  });

  // 'he/she' and 's/he' overlap their parts 'he' and 'she'. Of two overlapping matches the longer one wins (the earlier one on a tie), so --fix does not turn 'he/she' into 'they/they'.
  describe('overlapping pairs: the longest source span wins', () => {
    // Same flags as the inclusion rule in the root recheck.yaml.
    const inclusionRule = swapRule({
      keysAreRegex: true,
      wordBoundary: true,
      ignoreCase: true,
      pairs: {
        he: 'they',
        his: 'their',
        she: 'they',
        hers: 'their',
        'he/she': 'they',
        's/he': 'they',
      },
    });

    it('replaces a compound span in ONE edit and reports one problem for it', async () => {
      const content = 'Ask he/she or whoever.\n';

      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content }],
        [inclusionRule],
        {
          fix: true,
        }
      );

      expect(problems.map((problem) => [problem.line, problem.column, problem.match])).toEqual([
        [1, 5, 'he/she'],
      ]);
      expect(fixedFiles.get('t.md')).toBe('Ask they or whoever.\n'); // not 'they/they'
    });

    it('keeps standalone and trailing sub-key matches working, and the result lints clean', async () => {
      // Only the spans matter here; the grammar of 'they was' is not checked.
      const content = 'Ask he/she or whoever; then s/he said he was there.\n';

      const { fixedFiles } = await runRules([{ path: 't.md', content }], [inclusionRule], {
        fix: true,
      });
      const fixed = fixedFiles.get('t.md') ?? '';

      expect(fixed).toBe('Ask they or whoever; then they said they was there.\n');
      const relint = await runRules([{ path: 't.md', content: fixed }], [inclusionRule]);
      expect(relint.problems).toEqual([]);
    });

    it('de-overlaps LITERAL keys too (engine-level, not a keysAreRegex feature)', async () => {
      const rule = swapRule({
        wordBoundary: true,
        pairs: { 'he/she': 'they', he: 'they', she: 'they' },
      });
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content: 'Ask he/she now.\n' }],
        [rule],
        { fix: true }
      );
      expect(problems.map((problem) => problem.match)).toEqual(['he/she']);
      expect(fixedFiles.get('t.md')).toBe('Ask they now.\n');
    });

    it('breaks a length tie by keeping the earlier-starting match', async () => {
      const rule = swapRule({ pairs: { ab: 'X', bc: 'Y' } });
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content: 'abc\n' }],
        [rule],
        { fix: true }
      );
      expect(problems.map((problem) => [problem.line, problem.column, problem.match])).toEqual([
        [1, 1, 'ab'],
      ]);
      expect(fixedFiles.get('t.md')).toBe('Xc\n');
    });
  });

  describe('validation', () => {
    it.each<[string, unknown]>([
      [
        'the wrapped shape with reserved keys',
        { ignoreCase: true, wordBoundary: true, pairs: { colour: 'color' } },
      ],
    ])('accepts %s', async (_label, options) => {
      await expectValidOptions('swap', options);
    });

    it.each<[string, unknown, ...string[]]>([
      ['a non-boolean ignoreCase', { ignoreCase: 'yes', pairs: { colour: 'color' } }, 'ignoreCase'],
      [
        'a non-boolean wordBoundary',
        { wordBoundary: 'yes', pairs: { colour: 'color' } },
        'wordBoundary',
      ],
      [
        'a non-boolean includeCode',
        { includeCode: 'yes', pairs: { colour: 'color' } },
        'includeCode',
      ],
      ['a "pairs" that is not an object', { pairs: 'colour' }, 'pairs'],
      ['an empty "pairs" object', { pairs: {} }, 'pairs'],
      ['a "pairs" entry whose value is not a string', { pairs: { colour: 42 } }, 'colour'],
      // An empty key would hang the scan, so validation must reject it.
      ['a "pairs" entry whose key is an empty string', { pairs: { '': 'x' } }, 'pairs'],
      [
        'an unknown option alongside "pairs"',
        { pairs: { colour: 'color' }, unknownOption: true },
        'unknownOption',
      ],
      ['an empty options object (no pairs at all)', {}, 'Swap requires a "pairs"'],
      // The old direct shape (`swap: { he: they }`) is ignored by the engine, which only reads `options.pairs`.
      ['the direct top-level pairs shape', { he: 'they', his: 'their' }, '"he"'],
      [
        'the direct shape with a migration hint',
        { he: 'they', his: 'their' },
        'move find -> replace entries under "pairs:"',
      ],
      ['a direct entry whose key is an empty string', { '': 'x' }],
      ['a direct entry regardless of its value type', { he: 42 }, '"he"'],
      [
        'a reserved key with no "pairs", beside a direct entry',
        { ignoreCase: true, he: 'they' },
        '"he"',
      ],
    ])('rejects %s', async (_label, options, ...mentions) => {
      await expectInvalidOptions('swap', options, ...mentions);
    });
  });
});
