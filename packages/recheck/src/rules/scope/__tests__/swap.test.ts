import { describe, it, expect } from 'vitest';

import { validate } from '../../../config/validate.js';
import { runRules, runRulesUntilStable } from '../../../core/runner.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule, SwapAssertion } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { swap } from '../swap.js';
import { buildWholeFileContext } from './helpers.js';

describe('swap assertion', () => {
  // Prose rules must not lint code. By default inline code spans are masked before scanning; `includeCode: true` scans them.
  describe('includeCode option (inline-code masking)', () => {
    async function runSwap(content: string, options: SwapAssertion) {
      const rule: NormalizedRule = {
        name: 'test-swap',
        shortName: 'swap',
        severity: 'error',
        message: 'Use %s instead of %s.',
        scope: 'all',
        assertions: { swap: options },
      };
      return swap.execute(rule, 'test.md', buildWholeFileContext(content));
    }

    it('does not match inside an inline code span by default', async () => {
      const problems = await runSwap('Run `git checkout master` first.', {
        pairs: { master: 'primary' },
      });
      expect(problems).toEqual([]);
    });

    it('still matches the same word outside a code span', async () => {
      const problems = await runSwap('The master branch, see `master`.', {
        pairs: { master: 'primary' },
      });
      expect(problems).toHaveLength(1);
      expect(problems[0].column).toBe(5);
    });

    it('matches inside code when includeCode is true', async () => {
      const problems = await runSwap('Run `git checkout master`.', {
        pairs: { master: 'primary' },
        includeCode: true,
      });
      expect(problems).toHaveLength(1);
    });
  });

  // Masking replaces a code span with `\0` characters, which a negated class like `[^\s,]+` matches straight through. So matches are found on the original text and any match overlapping a code span is dropped.
  describe('range filtering for matches overlapping code spans', () => {
    async function runSwap(content: string, options: SwapAssertion) {
      const rule: NormalizedRule = {
        name: 'test-swap',
        shortName: 'swap',
        severity: 'error',
        message: 'Use %s instead of %s.',
        scope: 'all',
        assertions: { swap: options },
      };
      return swap.execute(rule, 'test.md', buildWholeFileContext(content));
    }

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
    const rule: NormalizedRule = {
      name: 'test-swap',
      shortName: 'swap',
      severity: 'error',
      message: 'Test message',
      scope: 'all',
      assertions: {
        swap: {
          pairs: { old: 'new' },
        },
      },
    };

    const file = 'empty.md';
    const context = buildWholeFileContext('');

    const problems = await swap.execute(rule, file, context);
    expect(problems).toEqual([]);
  });

  it("reports the true column for a match on a heading segment's first line", async () => {
    // A heading's content starts after the '## ', so the column needs the segment's start column.
    const content = '## Heading colour\n';
    const rule: NormalizedRule = {
      name: 'test-swap',
      shortName: 'swap',
      severity: 'error',
      message: 'Use %s instead of %s.',
      scope: 'heading',
      assertions: {
        swap: { pairs: { colour: 'color' } },
      },
    };

    const tree = parseMarkdown(content);
    const segments = extractScopes(tree, content).filter((s) => s.scope === 'heading.h2');
    const context: ScopeRuleContext = { segments, content, tree };

    const problems = await swap.execute(rule, 'test.md', context);

    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    // 'colour' starts at source column 12 ('## Heading '.length + 1).
    expect(problems[0].column).toBe(12);
  });

  // Table cell content is trimmed, so the column must point at the real text and not at the '|'. --fix must replace only the matched word.
  describe('table cell segments — trimmed content maps to true source columns', () => {
    const tableSwapRule = (scope: string | string[]): NormalizedRule => ({
      name: 'test-swap',
      shortName: 'swap',
      severity: 'error',
      message: 'Use %s instead of %s.',
      scope,
      assertions: {
        swap: { pairs: { colour: 'color' } },
      },
    });

    it('reports the true column and fixes only the word in a padded table.cell', async () => {
      const content = '| word   | colour |\n| ------ | ------ |\n| padded |  colour here |\n';
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content }],
        [tableSwapRule('table.cell')],
        { fix: true }
      );
      // Body cell '  colour here ': text starts at source column 13.
      expect(problems.map((p) => [p.line, p.column, p.match])).toEqual([[3, 13, 'colour']]);
      expect(fixedFiles.get('t.md')).toBe(
        '| word   | colour |\n| ------ | ------ |\n| padded |  color here |\n'
      );
    });

    it('reports the true column and fixes only the word in a padded table.header', async () => {
      const content = '| word   | colour |\n| ------ | ------ |\n| padded |  colour here |\n';
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content }],
        [tableSwapRule('table.header')],
        { fix: true }
      );
      // Header cell '| colour |': text starts at source column 12.
      expect(problems.map((p) => [p.line, p.column, p.match])).toEqual([[1, 12, 'colour']]);
      expect(fixedFiles.get('t.md')).toBe(
        '| word   | color |\n| ------ | ------ |\n| padded |  colour here |\n'
      );
    });

    it('handles a match at the very start of an unpadded cell', async () => {
      const content = '|word|x|\n|-|-|\n|colour|y|\n';
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content }],
        [tableSwapRule('table.cell')],
        { fix: true }
      );
      expect(problems.map((p) => [p.line, p.column, p.match])).toEqual([[3, 2, 'colour']]);
      expect(fixedFiles.get('t.md')).toBe('|word|x|\n|-|-|\n|color|y|\n');
    });

    it('keeps column arithmetic in code units with multi-byte text before the match', async () => {
      // 'a😀b ' is 5 UTF-16 code units ('😀' is an astral pair), so 'colour'
      // sits at source column 3 (cell text start) + 5 = 8.
      const content = '| a😀b colour | z |\n| ----------- | - |\n| x | y |\n';
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content }],
        [tableSwapRule('table.header')],
        { fix: true }
      );
      expect(problems.map((p) => [p.line, p.column, p.match])).toEqual([[1, 8, 'colour']]);
      expect(fixedFiles.get('t.md')).toBe('| a😀b color | z |\n| ----------- | - |\n| x | y |\n');
    });

    it('is idempotent: a second --fix pass over the fixed output changes nothing', async () => {
      const content = '| word   | colour |\n| ------ | ------ |\n| padded |  colour here |\n';
      const scope = ['table.header', 'table.cell'];
      const first = await runRules([{ path: 't.md', content }], [tableSwapRule(scope)], {
        fix: true,
      });
      const fixed = first.fixedFiles.get('t.md');
      expect(fixed).toBe('| word   | color |\n| ------ | ------ |\n| padded |  color here |\n');
      const second = await runRules(
        [{ path: 't.md', content: fixed ?? '' }],
        [tableSwapRule(scope)],
        { fix: true }
      );
      expect(second.problems).toEqual([]);
      expect(second.fixedFiles.size).toBe(0);
    });
  });

  // Line numbers, columns and fixes must be the same for LF, CRLF and CR files, and line endings must be kept.
  describe('line-ending-aware position mapping', () => {
    const swapRule: NormalizedRule = {
      name: 'test-swap',
      shortName: 'swap',
      severity: 'error',
      message: 'Use %s instead of %s.',
      scope: 'all',
      assertions: {
        swap: { pairs: { colour: 'color' } },
      },
    };

    for (const [label, ending] of [
      ['LF', '\n'],
      ['CRLF', '\r\n'],
      ['CR', '\r'],
    ] as const) {
      it(`reports 2:5 and fixes in place on a ${label} file`, async () => {
        const content = `Heading line one.${ending}Use colour here.${ending}`;
        const { problems, fixedFiles } = await runRules([{ path: 't.md', content }], [swapRule], {
          fix: true,
        });
        expect(problems.map((problem) => [problem.line, problem.column])).toEqual([[2, 5]]);
        expect(fixedFiles.get('t.md')).toBe(`Heading line one.${ending}Use color here.${ending}`);
      });
    }
  });

  // An empty pair key must not hang the scan, even if validate() was skipped. The timeout makes a hang fail the test.
  describe('zero-width match guard (defense in depth against an empty pair key)', () => {
    it(
      'completes without hanging and reports no problems for an empty key, even bypassing validate()',
      { timeout: 2000 },
      async () => {
        const content = 'Use colour here.\n';
        const rule: NormalizedRule = {
          name: 'test-swap-empty-key',
          shortName: 'swap',
          severity: 'error',
          scope: 'all',
          message: 'Use %s instead of %s.',
          assertions: { swap: { pairs: { '': 'x' } } },
        };

        const { problems } = await runRules([{ path: 'test.md', content }], [rule]);

        expect(problems).toEqual([]);
      }
    );
  });

  // With `ignoreCase`, the fix keeps the casing of the matched text, so 'Behaviour' becomes 'Behavior', not 'behavior'.
  describe('case-preserving fixes (ignoreCase)', () => {
    async function runSwapFix(content: string, options: SwapAssertion) {
      const rule: NormalizedRule = {
        name: 'test-swap',
        shortName: 'swap',
        severity: 'error',
        message: 'Use %s instead of %s.',
        scope: 'all',
        assertions: { swap: options },
      };
      return runRules([{ path: 't.md', content }], [rule], { fix: true });
    }

    it('preserves the matched casing when fixing an ignoreCase swap', async () => {
      const { fixedFiles } = await runSwapFix('Behaviour matters. behaviour too.\n', {
        pairs: { behaviour: 'behavior' },
        ignoreCase: true,
      });
      expect(fixedFiles.get('t.md')).toBe('Behavior matters. behavior too.\n');
    });

    it('also preserves ALL-CAPS casing when fixing an ignoreCase swap', async () => {
      const { fixedFiles } = await runSwapFix('BEHAVIOUR matters.\n', {
        pairs: { behaviour: 'behavior' },
        ignoreCase: true,
      });
      expect(fixedFiles.get('t.md')).toBe('BEHAVIOR matters.\n');
    });

    it('is idempotent: a second --fix pass over the fixed output changes nothing', async () => {
      const content = 'Behaviour matters. behaviour too.\n';
      const rule: NormalizedRule = {
        name: 'test-swap',
        shortName: 'swap',
        severity: 'error',
        message: 'Use %s instead of %s.',
        scope: 'all',
        assertions: { swap: { pairs: { behaviour: 'behavior' }, ignoreCase: true } },
      };
      const first = await runRulesUntilStable([{ path: 't.md', content }], [rule]);
      const fixed = first.fixedFiles.get('t.md');
      expect(fixed).toBe('Behavior matters. behavior too.\n');
      const second = await runRulesUntilStable([{ path: 't.md', content: fixed ?? '' }], [rule]);
      expect(second.problems).toEqual([]);
      expect(second.fixedFiles.size).toBe(0);
    });
  });

  describe('keysAreRegex', () => {
    const regexSwapRule = (pairs: Record<string, string>, extra = {}): NormalizedRule => ({
      name: 'test-swap-regex',
      shortName: 'swap',
      severity: 'error',
      message: 'Use "%s" instead of "%s".',
      scope: 'all',
      assertions: { swap: { keysAreRegex: true, pairs, ...extra } },
    });

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
      expect(problems.map((problem) => [problem.ruleName, problem.match])).toEqual([
        ['test-swap-regex', 'colour'],
      ]);
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
  describe('overlapping pairs -- longest source span wins', () => {
    // Same flags as the inclusion rule in the root recheck.yaml.
    const inclusionRule = (): NormalizedRule => ({
      name: 'test-inclusion',
      shortName: 'swap',
      severity: 'error',
      message: 'Use "%s" instead of "%s".',
      scope: 'all',
      assertions: {
        swap: {
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
        },
      },
    });

    it("fixes 'he/she' in ONE replacement instead of corrupting it to 'they/they'", async () => {
      const { fixedFiles } = await runRules(
        [{ path: 't.md', content: 'Ask he/she or whoever.\n' }],
        [inclusionRule()],
        { fix: true }
      );
      expect(fixedFiles.get('t.md')).toBe('Ask they or whoever.\n');
    });

    it('reports ONE problem for the compound span, not three', async () => {
      const { problems } = await runRules(
        [{ path: 't.md', content: 'Ask he/she or whoever.\n' }],
        [inclusionRule()]
      );
      expect(problems.map((problem) => [problem.line, problem.column, problem.match])).toEqual([
        [1, 5, 'he/she'],
      ]);
    });

    it("fixes 's/he' as one span (the trailing 'he' sub-match does not win)", async () => {
      const { fixedFiles } = await runRules(
        [{ path: 't.md', content: 'Then s/he said hi.\n' }],
        [inclusionRule()],
        { fix: true }
      );
      expect(fixedFiles.get('t.md')).toBe('Then they said hi.\n');
    });

    it('keeps a standalone sub-key match working', async () => {
      const { fixedFiles } = await runRules(
        [{ path: 't.md', content: 'And he was there.\n' }],
        [inclusionRule()],
        { fix: true }
      );
      // Only the span matters here; the grammar of 'they was' is not checked.
      expect(fixedFiles.get('t.md')).toBe('And they was there.\n');
    });

    it('is idempotent: a second --fix pass over the fixed output changes nothing', async () => {
      const content = 'Ask he/she or whoever; then s/he said he was there.\n';
      const first = await runRules([{ path: 't.md', content }], [inclusionRule()], { fix: true });
      const fixed = first.fixedFiles.get('t.md');
      expect(fixed).toBe('Ask they or whoever; then they said they was there.\n');
      const second = await runRules([{ path: 't.md', content: fixed ?? '' }], [inclusionRule()], {
        fix: true,
      });
      expect(second.problems).toEqual([]);
      expect(second.fixedFiles.size).toBe(0);
    });

    it('de-overlaps LITERAL keys too (engine-level, not a keysAreRegex feature)', async () => {
      const rule: NormalizedRule = {
        name: 'test-literal-overlap',
        shortName: 'swap',
        severity: 'error',
        message: 'Use "%s" instead of "%s".',
        scope: 'all',
        assertions: {
          swap: {
            wordBoundary: true,
            pairs: { 'he/she': 'they', he: 'they', she: 'they' },
          },
        },
      };
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content: 'Ask he/she now.\n' }],
        [rule],
        { fix: true }
      );
      expect(problems.map((problem) => problem.match)).toEqual(['he/she']);
      expect(fixedFiles.get('t.md')).toBe('Ask they now.\n');
    });

    it('breaks a length tie by keeping the earlier-starting match', async () => {
      const rule: NormalizedRule = {
        name: 'test-tie',
        shortName: 'swap',
        severity: 'error',
        message: 'Use "%s" instead of "%s".',
        scope: 'all',
        assertions: { swap: { pairs: { ab: 'X', bc: 'Y' } } },
      };
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
    function swapConfig(options: unknown) {
      return {
        'recheck/test-rule': {
          severity: 'error',
          message: 'Test message',
          assertions: { swap: options },
        },
      };
    }

    it('accepts the reserved-keys/wrapped shape (recheck/us-spelling-style)', async () => {
      const result = await validate(
        swapConfig({ ignoreCase: true, wordBoundary: true, pairs: { colour: 'color' } })
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    // The old direct shape (`swap: { he: they }`) is ignored by the engine, which only reads `options.pairs`. It is rejected so the mistake is visible.
    it('rejects the direct top-level pairs shape with a migration hint (recheck/inclusion-gender-culture-style)', async () => {
      const result = await validate(swapConfig({ he: 'they', his: 'their' }));

      expect(result.isValid).toBe(false);
      const messages = result.errors.map((error) => error.message);
      expect(messages.some((m) => m.includes('"he"'))).toBe(true);
      expect(messages.some((m) => m.includes('"his"'))).toBe(true);
      // The error must say how to fix the config.
      expect(messages.some((m) => m.includes('move find -> replace entries under "pairs:"'))).toBe(
        true
      );
    });

    it('rejects a non-boolean ignoreCase', async () => {
      const result = await validate(swapConfig({ ignoreCase: 'yes', pairs: { colour: 'color' } }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('ignoreCase'))).toBe(true);
    });

    it('rejects a non-boolean wordBoundary', async () => {
      const result = await validate(
        swapConfig({ wordBoundary: 'yes', pairs: { colour: 'color' } })
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('wordBoundary'))).toBe(true);
    });

    it('rejects a non-boolean includeCode', async () => {
      const result = await validate(swapConfig({ includeCode: 'yes', pairs: { colour: 'color' } }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('includeCode'))).toBe(true);
    });

    it('rejects a wrong-typed "pairs" (not an object)', async () => {
      const result = await validate(swapConfig({ pairs: 'colour' }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('pairs'))).toBe(true);
    });

    it('rejects an empty "pairs" object', async () => {
      const result = await validate(swapConfig({ pairs: {} }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('pairs'))).toBe(true);
    });

    it('rejects a "pairs" entry whose value is not a string', async () => {
      const result = await validate(swapConfig({ pairs: { colour: 42 } }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('colour'))).toBe(true);
    });

    it('rejects a direct top-level entry regardless of its value type', async () => {
      const result = await validate(swapConfig({ he: 42 }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('"he"'))).toBe(true);
    });

    // An empty key would hang the scan, so validation must reject it, like `either` keys in `consistency`.
    it('rejects a "pairs" entry whose key is an empty string', async () => {
      const result = await validate(swapConfig({ pairs: { '': 'x' } }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('pairs'))).toBe(true);
    });

    it('rejects a direct top-level entry whose key is an empty string', async () => {
      const result = await validate(swapConfig({ '': 'x' }));

      expect(result.isValid).toBe(false);
    });

    it('rejects an unknown swap option alongside "pairs"', async () => {
      const result = await validate(
        swapConfig({ pairs: { colour: 'color' }, unknownOption: true })
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('unknownOption'))).toBe(true);
    });

    it('rejects an empty swap options object (no pairs at all)', async () => {
      const result = await validate(swapConfig({}));

      expect(result.isValid).toBe(false);
    });

    it('rejects a reserved key (ignoreCase) with no "pairs" at all, even with other keys present', async () => {
      // Pairs are only read from `options.pairs`. `he` is an unknown option and `pairs` is missing, so both are errors.
      const result = await validate(swapConfig({ ignoreCase: true, he: 'they' }));

      expect(result.isValid).toBe(false);
    });
  });
});
