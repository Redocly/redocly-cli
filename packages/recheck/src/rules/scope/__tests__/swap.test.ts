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
  // Task 1 (Phase 4): prose rules must not lint code -- a swap like
  // master -> primary would otherwise fire inside `git checkout master`,
  // the usage Google's style guide explicitly sanctions in code font.
  // Default behavior masks inline code spans before scanning; `includeCode:
  // true` opts back into scanning them.
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

  // Task 1 (Phase 4), fix wave 1: masking substitutes a same-length run of
  // `\0` for a code span's real characters, and `\0` is not whitespace or
  // a comma. A negated-class regex key (keysAreRegex: true) like
  // `[^\s,]+` treats that run as ordinary "not comma, not whitespace" text
  // and matches straight through it, merging text before and after the
  // span -- including the comma the class exists to react to -- into one
  // bogus match. Range filtering (running the regex against the
  // unmodified content, then discarding any match whose span overlaps a
  // code span) has no such hole.
  describe('range filtering for matches overlapping code spans (Task 1 fix wave 1)', () => {
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
      // Masking turns 'a`,`b' into 'a\0\0\0b'; [^\s,]+ matches that whole
      // run as ONE match (index 0, length 5) -- a match that spans
      // straight through the code span's own comma.
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
    // Regression for FIX 6(c): a heading segment's content excludes the
    // '## ' marker, so its startColumn (4 here) must be added when the
    // match falls on the segment's first line — otherwise the reported
    // column is relative to the segment content, not the source line.
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

  // Regression (Bugbot): table cell segments carried TRIMMED content but
  // the full cell token's startColumn (at the leading '|'), so a match's
  // column mapped back LEFT of the real text and --fix rewrote the
  // pipe/padding instead of the matched word — e.g. fixing
  // '| padded | colour |' produced '| padded color ur |'. Columns must land
  // exactly on the matched text and --fix must replace only that word.
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

  // Regression (Bugbot): findMatches computed line/column with a bare
  // '\n' split / lastIndexOf('\n'), so on a CR-only file every match
  // landed on line 1 with a column counted from the start of the FILE --
  // and --fix then edited that wrong position (inserting the replacement
  // into line 1 while leaving the actual match untouched). Positions and
  // fixes must be identical across LF / CRLF / CR twins, with the file's
  // own line endings preserved by the applier.
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

  // Defense in depth: validate() rejects an empty-string pair key (see the
  // "validation" describe block below), but a caller can still build a
  // NormalizedRule programmatically and hand it straight to runRules(),
  // bypassing validate() entirely -- same bypass path as consistency.test.ts's
  // own zero-width guard test. Without a guard in findMatches's exec loop,
  // the empty key escapes to the zero-width pattern '' (or '\b\b' with
  // wordBoundary): a global regex's lastIndex never advances past a
  // zero-length match, so the loop spins forever. The explicit timeout below
  // is what turns a stuck run into a reported (failing) test rather than a
  // CI job that hangs until it's killed.
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

  // Phase 4, Task 3: with `ignoreCase: true`, a swap match's casing can
  // differ from the configured key -- a sentence-initial "Behaviour" used
  // to be replaced by literal "behavior", silently lowercasing the start of
  // the sentence. --fix must apply the MATCHED text's observed casing to
  // the replacement instead of inserting the configured replacement as-is.
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
      const first = await runRulesUntilStable([{ path: 't.md', content }], [rule], { fix: true });
      const fixed = first.fixedFiles.get('t.md');
      expect(fixed).toBe('Behavior matters. behavior too.\n');
      const second = await runRulesUntilStable([{ path: 't.md', content: fixed ?? '' }], [rule], {
        fix: true,
      });
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

    // Regression: an invalid regex KEY used to throw out of findMatches and
    // crash the WHOLE rule via the runner's internalError path -- so the
    // valid `colour` pair below was never reported at all. An invalid key
    // must no-op only itself, matching pattern.ts's/occurrence.ts's
    // ignore-invalid-regex convention.
    it('no-ops an invalid regex KEY while other pairs still match and fix', async () => {
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content: 'A colour here.\n' }],
        [regexSwapRule({ '[invalid': 'x', colour: 'color' })],
        { fix: true }
      );
      // No recheck/internal-error problem -- only the valid pair's finding.
      expect(problems.map((problem) => [problem.ruleName, problem.match])).toEqual([
        ['test-swap-regex', 'colour'],
      ]);
      expect(fixedFiles.get('t.md')).toBe('A color here.\n');
    });

    // The exec loop's lastIndex guard (same intent as repetition.ts's) is
    // what keeps a zero-width-CAPABLE regex key from spinning forever once
    // keysAreRegex hands user regexes straight to `new RegExp`. The explicit
    // timeout turns a stuck run into a failing test, not a hung CI job.
    it(
      'completes without hanging for a zero-width-capable regex key',
      { timeout: 2000 },
      async () => {
        const problems = await swap.execute(
          regexSwapRule({ 'a*': 'x' }),
          't.md',
          buildWholeFileContext('ba')
        );
        // '' at offset 0 and '' at offset 2 are zero-width -- the guard
        // advances lastIndex past them but must NOT record them; only the
        // real 'a' match at offset 1 is a genuine finding.
        expect(problems).toHaveLength(1);
        expect(problems[0].match).toBe('a');
      }
    );

    // High-severity Bugbot finding: the zero-width guard above stopped the
    // loop from hanging but still RECORDED the empty match at every
    // position it passed through. Under --fix each recording became a
    // zero-length insert (deleteCount 0), so a pattern like 'a*' against
    // text with no 'a' at all rewrote the file at EVERY character offset.
    // An empty-text match is semantically meaningless for swap (there's
    // nothing to "find" or replace), so it must be skipped entirely, not
    // just loop-guarded.
    it('reports zero problems and zero fixes for a zero-width-only match (no `a` in the text)', async () => {
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content: 'bbb here\n' }],
        [regexSwapRule({ 'a*': 'x' }, { wordBoundary: false })],
        { fix: true }
      );
      expect(problems).toEqual([]);
      expect(fixedFiles.size).toBe(0);
    });

    // Guard must not swallow GENUINE findings alongside zero-width
    // positions: 'a+' can never match zero-width, so every real run of
    // 'a' characters is still reported and fixed normally.
    it('still reports and fixes real matches for a pattern that can never be zero-width (a+)', async () => {
      const { problems, fixedFiles } = await runRules(
        [{ path: 't.md', content: 'aaa here\n' }],
        [regexSwapRule({ 'a+': 'x' })],
        { fix: true }
      );
      expect(problems.map((p) => p.match)).toEqual(['aaa']);
      expect(fixedFiles.get('t.md')).toBe('x here\n');
    });

    // Idempotency: a zero-width-capable pattern must converge to zero
    // fixes on a second pass over already-fixed content, same as the
    // overlapping-pairs idempotency check above.
    it('is idempotent under runRulesUntilStable for a zero-width-capable pattern', async () => {
      const content = 'aaa here, also a and bbb.\n';
      const rule = regexSwapRule({ 'a*': 'x' }, { wordBoundary: false });
      const first = await runRulesUntilStable([{ path: 't.md', content }], [rule], { fix: true });
      const second = await runRulesUntilStable(
        [{ path: 't.md', content: first.fixedFiles.get('t.md') ?? content }],
        [rule],
        { fix: true }
      );
      expect(second.problems).toEqual([]);
      expect(second.fixedFiles.size).toBe(0);
    });
  });

  // Regression (root-config corruption): compound pairs like 'he/she' and
  // 's/he' overlap their standalone sub-keys ('he', 'she'). findMatches used
  // to emit ALL of them; the fix applier's rightmost-first overlap-skip then
  // dropped the compound (widest) match and applied both flanking sub-matches,
  // so --fix turned 'he/she' into 'they/they' and 's/he' into 's/they'.
  // findMatches must de-overlap by source span first: when two matches
  // overlap, the LONGER wins (ties: the earlier-starting one), so compound
  // pairs win by construction for any user config.
  describe('overlapping pairs -- longest source span wins', () => {
    // Mirrors the root recheck.yaml inclusion rule's flags exactly
    // (keysAreRegex + wordBoundary + ignoreCase).
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
      // ('was' agreement is the config's business, not the engine's -- this
      // pins span mechanics only.)
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

    // The pre-re-architecture "direct" shape (`swap: { he: they }`) was
    // NEVER consumed by the engine after the re-architecture — findMatches
    // reads pairs exclusively from `options.pairs`, so direct entries were
    // silently inert (a rule that validates but can never report anything).
    // Rejecting the shape with a migration hint is what surfaces that
    // misconfiguration instead of hiding it.
    it('rejects the direct top-level pairs shape with a migration hint (recheck/inclusion-gender-culture-style)', async () => {
      const result = await validate(swapConfig({ he: 'they', his: 'their' }));

      expect(result.isValid).toBe(false);
      const messages = result.errors.map((error) => error.message);
      expect(messages.some((m) => m.includes('"he"'))).toBe(true);
      expect(messages.some((m) => m.includes('"his"'))).toBe(true);
      // The error must tell the user HOW to migrate, not just reject.
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

    // Regression guard: an empty-string KEY escapes (in swap.ts's
    // findMatches) to the zero-width pattern '' (or '\b\b' with
    // wordBoundary), which never advances a global regex's lastIndex and
    // hangs the scan loop forever (see the "zero-width match guard" describe
    // block above for the direct-execution side of this). Validation must
    // reject this at config load time, same as consistency's `either` keys.
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
      // `options.pairs` is what findMatches actually reads (rules/scope/
      // swap.ts) -- a same-level "direct pair" key like `he` here is never
      // applied, so this config can never swap anything: `he` is an
      // unknown-option error (with the move-under-pairs hint) and the
      // missing `pairs` is its own error.
      const result = await validate(swapConfig({ ignoreCase: true, he: 'they' }));

      expect(result.isValid).toBe(false);
    });
  });
});
