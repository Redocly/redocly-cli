import { describe, it, expect } from 'vitest';

import { validate } from '../../../config/validate.js';
import { runRules } from '../../../core/runner.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { conditional } from '../conditional.js';
import { buildWholeFileContext } from './helpers.js';

function conditionalRule(
  message: string | undefined,
  options: { first: string; second: string; ignoreCase?: boolean },
  scope: string | string[] = 'all'
): NormalizedRule {
  return {
    name: 'test-conditional',
    shortName: 'conditional',
    severity: 'error',
    message,
    scope,
    assertions: { conditional: options },
  };
}

// Builds a ScopeRuleContext filtered to the given scope predicate, matching
// the recipe in src/rules/CONTRIBUTING.md's "Testing" section for scoped
// rules (parseMarkdown + extractScopes, filtered by scope name) -- same
// helper as consistency.test.ts's/occurrence.test.ts's buildScopedContext.
// `content` on the returned context is always the FULL raw file, regardless
// of the segment filter -- exactly what lets the "second checked
// file-wide" tests below work.
function buildScopedContext(
  content: string,
  scopeFilter: (scope: string) => boolean
): ScopeRuleContext {
  const tree = parseMarkdown(content);
  const segments = extractScopes(tree, content).filter((segment) => scopeFilter(segment.scope));
  return { segments, content, tree };
}

const MESSAGE = '"%s" appears but "%s" was never introduced.';

describe('conditional assertion', () => {
  it('flags every `first` match when `second` is absent from the whole file', async () => {
    const content = 'TODO: fix this.\n\nTODO: fix that too.\n';
    const rule = conditionalRule(MESSAGE, { first: 'TODO', second: 'DONE' });
    const ctx = buildWholeFileContext(content);

    const problems = await conditional.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(2);
    expect(problems.map((p) => [p.line, p.column])).toEqual([
      [1, 1],
      [3, 1],
    ]);
    for (const problem of problems) {
      expect(problem.message).toBe('"TODO" appears but "DONE" was never introduced.');
      expect(problem.match).toBe('TODO');
    }
    // Problem.text is the FULL source line containing the match
    // (pattern.ts's convention); Problem.match keeps the matched substring.
    expect(problems.map((p) => p.text)).toEqual(['TODO: fix this.', 'TODO: fix that too.']);
  });

  it('reports zero problems when `second` appears ANYWHERE in the file, even outside the rule scope (inside a code block while scope is `paragraph`)', async () => {
    const content = 'TODO: fix this.\n\n```\nDONE\n```\n';
    const rule = conditionalRule(MESSAGE, { first: 'TODO', second: 'DONE' }, 'paragraph');
    const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');
    // Sanity: `first` really is present in a segment that was scanned.
    expect(ctx.segments.some((segment) => /TODO/.test(segment.content))).toBe(true);
    // Sanity: `second` is NOT present in any scanned (paragraph) segment --
    // it only lives inside ctx.content's raw code fence.
    expect(ctx.segments.some((segment) => /DONE/.test(segment.content))).toBe(false);
    expect(ctx.content).toContain('DONE');

    const problems = await conditional.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  it('reports zero problems when neither `first` nor `second` appear', async () => {
    const content = 'Nothing interesting here.\n';
    const rule = conditionalRule(MESSAGE, { first: 'TODO', second: 'DONE' });
    const ctx = buildWholeFileContext(content);

    const problems = await conditional.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  describe('overlapping scopes dedup by source position (regression guard)', () => {
    // scope [paragraph, sentence]: every sentence segment overlaps its own
    // paragraph segment, so each `first` occurrence is matched TWICE at the
    // exact same absolute source position. Without position dedup that
    // double-counts -- two problems per occurrence instead of one.
    const content = 'Prefer TODO here. Also TODO there. More TODO again.\n';

    it('produces exactly ONE problem per source occurrence of `first`', async () => {
      const rule = conditionalRule(MESSAGE, { first: 'TODO', second: 'DONE' }, [
        'paragraph',
        'sentence',
      ]);
      const ctx = buildScopedContext(
        content,
        (scope) => scope === 'paragraph' || scope === 'sentence'
      );
      // Sanity: the overlap this test exists for is really present.
      expect(ctx.segments.some((segment) => segment.scope === 'paragraph')).toBe(true);
      expect(ctx.segments.some((segment) => segment.scope === 'sentence')).toBe(true);

      const problems = await conditional.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(3);
      expect(problems.map((p) => [p.line, p.column])).toEqual([
        [1, 8],
        [1, 24],
        [1, 41],
      ]);
      for (const problem of problems) {
        expect(problem.message).toBe('"TODO" appears but "DONE" was never introduced.');
      }
    });
  });

  describe('ignoreCase', () => {
    it('applies to `first`: a differently-cased match is still flagged', async () => {
      const content = 'todo: fix this.\n';
      const rule = conditionalRule(
        MESSAGE,
        { first: 'TODO', second: 'DONE', ignoreCase: true },
        'all'
      );
      const ctx = buildWholeFileContext(content);

      const problems = await conditional.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].match).toBe('todo');
      expect(problems[0].message).toBe('"todo" appears but "DONE" was never introduced.');
    });

    it('applies to `second`: a differently-cased second match still satisfies the condition', async () => {
      const content = 'TODO: fix this.\n\ndone later.\n';
      const rule = conditionalRule(
        MESSAGE,
        { first: 'TODO', second: 'DONE', ignoreCase: true },
        'all'
      );
      const ctx = buildWholeFileContext(content);

      const problems = await conditional.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('is case-sensitive by default: a lowercase `second` occurrence does not satisfy an uppercase pattern', async () => {
      const content = 'TODO: fix this.\n\ndone later.\n';
      const rule = conditionalRule(MESSAGE, { first: 'TODO', second: 'DONE' });
      const ctx = buildWholeFileContext(content);

      const problems = await conditional.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
    });
  });

  // High-severity Bugbot finding: `first`'s exec loop advances lastIndex
  // past a zero-width match (e.g. a user pattern like 'x*') to avoid
  // hanging, but used to still RECORD the empty match at every position it
  // passed through -- flooding the file with a "problem" per character
  // offset. An empty-text match has no real `first` occurrence to report,
  // so it must be skipped, not just loop-guarded.
  describe('zero-width `first` pattern (defense against per-offset spam)', () => {
    it('reports zero problems for a zero-width-only `first` match (no literal "x" in the text)', async () => {
      const content = 'Nothing relevant here at all.\n';
      const rule = conditionalRule(MESSAGE, { first: 'x*', second: 'DONE' });
      const ctx = buildWholeFileContext(content);

      const problems = await conditional.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('still reports the real `first` occurrence alongside zero-width positions', async () => {
      const content = 'Has an x in it.\n';
      const rule = conditionalRule(MESSAGE, { first: 'x*', second: 'DONE' });
      const ctx = buildWholeFileContext(content);

      const problems = await conditional.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].match).toBe('x');
    });
  });

  // High-severity Bugbot finding: the `second`-present check was a bare
  // `secondRe.test(ctx.content)`, so any zero-width-capable `second` pattern
  // (e.g. 'x*', '.*', '\b') always "succeeded" -- even with no real `second`
  // text anywhere in the file -- silently satisfying the rule and hiding
  // every `first` match. `second` must only count as present via a
  // non-empty match, mirroring the zero-width skip `first`'s own loop
  // already uses above.
  describe('zero-width `second` pattern (must not count as "second is present")', () => {
    it('flags every `first` match when `second` only ever produces a zero-width match (no literal "x" anywhere)', async () => {
      const content = 'TODO: check this.\n\nTODO: check that too.\n';
      const rule = conditionalRule(MESSAGE, { first: 'TODO', second: 'x*' });
      const ctx = buildWholeFileContext(content);

      const problems = await conditional.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(2);
      for (const problem of problems) {
        expect(problem.match).toBe('TODO');
      }
    });

    it('reports zero problems once `second` has a real non-empty match somewhere in the file', async () => {
      const content = 'TODO: check this.\n\nxx appears here.\n';
      const rule = conditionalRule(MESSAGE, { first: 'TODO', second: 'x*' });
      const ctx = buildWholeFileContext(content);

      const problems = await conditional.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });
  });

  describe('invalid regex (no crash, zero problems)', () => {
    it('an invalid `first` pattern reports zero problems without throwing', async () => {
      const content = 'Nothing to see here at all.\n';
      const rule = conditionalRule(MESSAGE, { first: '(unterminated', second: 'DONE' });
      const ctx = buildWholeFileContext(content);

      await expect(conditional.execute(rule, 'test.md', ctx)).resolves.toEqual([]);
    });

    it('an invalid `second` pattern reports zero problems without throwing, even though `first` is present', async () => {
      const content = 'TODO: fix this.\n';
      const rule = conditionalRule(MESSAGE, { first: 'TODO', second: '(unterminated' });
      const ctx = buildWholeFileContext(content);

      await expect(conditional.execute(rule, 'test.md', ctx)).resolves.toEqual([]);
    });
  });

  it("reports the true column for a `first` match on a heading segment's first line", async () => {
    // Regression-style check (mirrors consistency.test.ts/repetition.test.ts):
    // a heading segment's content excludes the '## ' marker, so its
    // startColumn (4 here) must be added when the match falls on the
    // segment's first line.
    const content = '## TODO here\n';
    const rule = conditionalRule(MESSAGE, { first: 'TODO', second: 'DONE' }, 'heading');
    const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

    const problems = await conditional.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    // '## TODO here': 'TODO' starts at source column 4.
    expect(problems[0].column).toBe(4);
    // Problem.text is the segment-content line containing the match (same
    // as pattern.ts): the heading's semantic text, without the '## ' marker.
    expect(problems[0].text).toBe('TODO here');
    expect(problems[0].match).toBe('TODO');
  });

  // The no-`rule.message` fallback template must have exactly as many `%s`
  // placeholders as values passed to formatTemplate -- a mismatch either
  // leaves a literal "%s" in the output or silently drops a value. This
  // path is only reachable by a caller building a NormalizedRule
  // programmatically (message is optional at the type level; see
  // types/rules.ts) and handing it straight to runRules, bypassing
  // validate() (which requires `message` via the JSON schema) entirely --
  // same as consistency.test.ts's/repetition.test.ts's equivalent block.
  describe('no-message fallback (programmatic NormalizedRule, bypassing validate())', () => {
    it('falls back to the two-placeholder template with the `first` match then `second`', async () => {
      const content = 'TODO: fix this.\n';
      const rule: NormalizedRule = {
        name: 'test-conditional-fallback',
        shortName: 'conditional',
        severity: 'error',
        scope: 'all',
        assertions: { conditional: { first: 'TODO', second: 'DONE' } },
      };

      const { problems } = await runRules([{ path: 'test.md', content }], [rule]);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('"TODO" appears but "DONE" was never introduced.');
    });
  });

  describe('validation', () => {
    function conditionalConfig(options: unknown) {
      return {
        'recheck/test-rule': {
          severity: 'error',
          message: 'Test message',
          assertions: { conditional: options },
        },
      };
    }

    it('accepts a well-formed config', async () => {
      const result = await validate(
        conditionalConfig({ first: 'TODO', second: 'DONE', ignoreCase: true })
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects a config missing "first"', async () => {
      const result = await validate(conditionalConfig({ second: 'DONE' }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('first'))).toBe(true);
    });

    it('rejects a config missing "second"', async () => {
      const result = await validate(conditionalConfig({ first: 'TODO' }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('second'))).toBe(true);
    });

    it('rejects an empty string "first"', async () => {
      const result = await validate(conditionalConfig({ first: '', second: 'DONE' }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('first'))).toBe(true);
    });

    it('rejects an empty string "second"', async () => {
      const result = await validate(conditionalConfig({ first: 'TODO', second: '' }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('second'))).toBe(true);
    });

    it('rejects a non-string "first"', async () => {
      const result = await validate(conditionalConfig({ first: 42, second: 'DONE' }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('first'))).toBe(true);
    });

    it('rejects a non-string "second"', async () => {
      const result = await validate(conditionalConfig({ first: 'TODO', second: 42 }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('second'))).toBe(true);
    });

    it('rejects a config missing both "first" and "second"', async () => {
      const result = await validate(conditionalConfig({}));

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('rejects an unknown conditional option', async () => {
      const result = await validate(
        conditionalConfig({ first: 'TODO', second: 'DONE', unknownOption: true })
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('unknownOption'))).toBe(true);
    });

    it('rejects a non-boolean ignoreCase', async () => {
      const result = await validate(
        conditionalConfig({ first: 'TODO', second: 'DONE', ignoreCase: 'yes' })
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('ignoreCase'))).toBe(true);
    });
  });
});
