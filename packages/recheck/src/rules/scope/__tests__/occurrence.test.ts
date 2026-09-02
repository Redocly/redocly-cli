import { describe, it, expect } from 'vitest';

import { validate } from '../../../config/validate.js';
import { runRules } from '../../../core/runner.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { occurrence } from '../occurrence.js';

// Builds a ScopeRuleContext filtered to the given scope predicate, matching
// the recipe in src/rules/CONTRIBUTING.md's "Testing" section for scoped
// rules (parseMarkdown + extractScopes, filtered by scope name).
function buildScopedContext(
  content: string,
  scopeFilter: (scope: string) => boolean
): ScopeRuleContext {
  const tree = parseMarkdown(content);
  const segments = extractScopes(tree, content).filter((segment) => scopeFilter(segment.scope));
  return { segments, content, tree };
}

function occurrenceRule(
  message: string,
  scope: string,
  options: { pattern: string; min?: number; max?: number; ignoreCase?: boolean }
): NormalizedRule {
  return {
    name: 'test-occurrence',
    shortName: 'occurrence',
    severity: 'error',
    message,
    scope,
    assertions: { occurrence: options },
  };
}

describe('occurrence assertion', () => {
  it('flags a segment exceeding max', async () => {
    // Paragraph with 4 sentence-ending marks, max 3 — scope: paragraph,
    // pattern '[.!?]'.
    const content = 'First sentence. Second sentence! Third sentence? Fourth sentence.\n';
    const rule = occurrenceRule('Too many sentences (%s found, max %s).', 'paragraph', {
      pattern: '[.!?]',
      max: 3,
    });
    const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');

    const problems = await occurrence.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe('Too many sentences (4 found, max 3).');
    expect(problems[0].line).toBe(1); // segment start
  });

  describe('min: 1 acts as existence — flags segments missing the pattern', () => {
    it('flags a heading with no trailing colon', async () => {
      const content = '## Getting Started\n';
      const rule = occurrenceRule(
        'Heading should end with a colon (%s found, min %s).',
        'heading',
        { pattern: ':$', min: 1 }
      );
      const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

      const problems = await occurrence.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('Heading should end with a colon (0 found, min 1).');
      expect(problems[0].line).toBe(1);
    });

    it('does not flag a heading that already has a trailing colon', async () => {
      const content = '## Getting Started:\n';
      const rule = occurrenceRule(
        'Heading should end with a colon (%s found, min %s).',
        'heading',
        { pattern: ':$', min: 1 }
      );
      const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

      const problems = await occurrence.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(0);
    });
  });

  describe('respects ignoreCase', () => {
    it('counts case-insensitively when ignoreCase is set', async () => {
      const content = 'todo later. TODO again.\n';
      const rule = occurrenceRule('Too many TODOs (%s found, max %s).', 'paragraph', {
        pattern: 'todo',
        max: 1,
        ignoreCase: true,
      });
      const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');

      const problems = await occurrence.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('Too many TODOs (2 found, max 1).');
    });

    it('counts case-sensitively when ignoreCase is unset', async () => {
      const content = 'todo later. TODO again.\n';
      const rule = occurrenceRule('Too many TODOs (%s found, max %s).', 'paragraph', {
        pattern: 'todo',
        max: 1,
      });
      const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');

      // Only the lowercase 'todo' matches case-sensitively — 1 occurrence,
      // within the max of 1 — so nothing is flagged.
      const problems = await occurrence.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(0);
    });
  });

  it('ignores an invalid regex pattern instead of throwing', async () => {
    const rule = occurrenceRule('Test message.', 'paragraph', { pattern: '[', max: 1 });
    const ctx = buildScopedContext('Some text.\n', (scope) => scope === 'paragraph');

    const problems = await occurrence.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  it('reports zero problems when the scope matches no segment at all, even for a min-bounded rule', async () => {
    // A document with no heading gives a heading-scoped rule an EMPTY
    // segment list. occurrence counts per segment, so "no segments" means
    // "nothing to check" -- NOT a min-violation of some imaginary empty
    // segment.
    const content = 'Just a paragraph, no heading anywhere.\n';
    const rule = occurrenceRule('Missing (%s found, min %s).', 'heading', {
      pattern: ':$',
      min: 1,
    });
    const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));
    expect(ctx.segments).toEqual([]);

    const problems = await occurrence.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  describe('validation rejects occurrence with neither min nor max', () => {
    function occurrenceConfig(options: Record<string, unknown>) {
      return {
        'recheck/test-rule': {
          severity: 'error',
          message: 'Test message',
          assertions: { occurrence: options },
        },
      };
    }

    it('errors when neither min nor max is set, mentioning min/max', async () => {
      const result = await validate(occurrenceConfig({ pattern: '[.!?]' }));

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (error) => error.message.includes('min') && error.message.includes('max')
        )
      ).toBe(true);
    });

    it('accepts occurrence with only max set', async () => {
      const result = await validate(occurrenceConfig({ pattern: '[.!?]', max: 3 }));

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts occurrence with only min set', async () => {
      const result = await validate(occurrenceConfig({ pattern: '[.!?]', min: 1 }));

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects an unknown occurrence option', async () => {
      const result = await validate(
        occurrenceConfig({ pattern: '[.!?]', max: 3, unknownOption: true })
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('unknownOption'))).toBe(true);
    });
  });

  // Finding 1 (Phase 3 Task 2 review): without a `pattern` check,
  // `new RegExp(undefined, 'g')` compiles to an always-matching empty
  // pattern (`/(?:)/g`). A max-bounded rule then floods every segment with
  // false positives, and a min-only rule can never fire (an empty pattern
  // always "matches" at every position), all silently — the config passes
  // validation, so the author never learns `pattern` was missing.
  describe('validation rejects occurrence with a missing/invalid pattern', () => {
    function occurrenceConfig(options: Record<string, unknown>) {
      return {
        'recheck/test-rule': {
          severity: 'error',
          message: 'Test message',
          assertions: { occurrence: options },
        },
      };
    }

    it('errors when pattern is missing, mentioning pattern', async () => {
      const result = await validate(occurrenceConfig({ min: 1 }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('pattern'))).toBe(true);
    });

    it('errors when pattern is an empty string, mentioning pattern', async () => {
      const result = await validate(occurrenceConfig({ pattern: '', max: 3 }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('pattern'))).toBe(true);
    });

    it('errors when pattern is not a string, mentioning pattern', async () => {
      const result = await validate(occurrenceConfig({ pattern: 42, max: 3 }));

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('pattern'))).toBe(true);
    });

    it('still accepts occurrence with a valid non-empty string pattern', async () => {
      const result = await validate(occurrenceConfig({ pattern: '[.!?]', max: 3 }));

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  // An inverted range (min > max) can never be satisfied by any count, so
  // the rule would flag EVERY segment it scopes to — always a config
  // mistake, never a legitimate rule.
  describe('validation rejects occurrence with min > max', () => {
    function occurrenceConfig(options: Record<string, unknown>) {
      return {
        'recheck/test-rule': {
          severity: 'error',
          message: 'Test message',
          assertions: { occurrence: options },
        },
      };
    }

    it('errors when min exceeds max, mentioning both bounds', async () => {
      const result = await validate(occurrenceConfig({ pattern: '[.!?]', min: 5, max: 3 }));

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (error) => error.message.includes('min') && error.message.includes('max')
        )
      ).toBe(true);
    });

    it('still accepts min === max (an exact-count requirement)', async () => {
      const result = await validate(occurrenceConfig({ pattern: '[.!?]', min: 3, max: 3 }));

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  // Final-review fix (Item 5): `min`/`max` had NO type check at all -- the
  // brief's exact repro, `occurrence: { pattern: ",", max: "two" }`, used to
  // validate clean, then occurrence.ts's `count > "two"` is NaN-false (a
  // number is never `>` a non-numeric string), so a max-bounded rule NEVER
  // fires. Every sibling numeric validator (`metric`, `length`,
  // `list-length`) already checks this.
  describe('validation rejects non-number min/max', () => {
    function occurrenceConfig(options: Record<string, unknown>) {
      return {
        'recheck/test-rule': {
          severity: 'error',
          message: 'Test message',
          assertions: { occurrence: options },
        },
      };
    }

    it("rejects a non-number max (the brief's exact repro)", async () => {
      const result = await validate(occurrenceConfig({ pattern: ',', max: 'two' }));

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (error) => error.message.includes('max') && error.message.includes('number')
        )
      ).toBe(true);
    });

    it('rejects a non-number min', async () => {
      const result = await validate(occurrenceConfig({ pattern: ',', min: '2' }));

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (error) => error.message.includes('min') && error.message.includes('number')
        )
      ).toBe(true);
    });

    it('still accepts numeric min/max', async () => {
      const result = await validate(occurrenceConfig({ pattern: ',', min: 1, max: 3 }));

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  // Finding 2 (Phase 3 Task 2 review): the no-`rule.message` fallback
  // templates had 3 `%s` placeholders but only 2 values are ever passed to
  // formatTemplate (COUNT then BOUND), so the 3rd placeholder was left as a
  // literal, un-substituted "%s" in the output, AND the surrounding wording
  // put COUNT in the sentence position documented for BOUND (and vice
  // versa). The JSON schema requires `message` (schema.ts `required`), so
  // this path is unreachable through schema-validated YAML configs — it's
  // only reachable by a caller building a NormalizedRule programmatically
  // (message is optional at the type level; see types/rules.ts) and handing
  // it straight to runRules, bypassing validate() entirely.
  // Bugbot finding: matchAll over a zero-width-capable pattern (e.g. `a*`)
  // yields a match at EVERY position in the segment, not just at real
  // occurrences -- inflating the count so `max` bounds always violate and
  // `min` is trivially satisfied. Same class of bug fixed in swap/
  // conditional/repetition (b7f345004ba); occurrence's matchAll path was
  // missed because matchAll's built-in iterator already avoids the hang
  // those exec loops guarded against, so there was no lastIndex bug to
  // notice -- only the (silent) count inflation remained.
  describe('zero-width matches do not inflate the count', () => {
    it('reports zero problems for a zero-width-only pattern (no "a" in the text)', async () => {
      const content = 'bbb here now\n';
      const rule = occurrenceRule('Too many (%s found, max %s).', 'paragraph', {
        pattern: 'a*',
        max: 3,
      });
      const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');

      const problems = await occurrence.execute(rule, 'test.md', ctx);

      // Every one of the 13 positions in 'bbb here now\n' matches `a*`
      // with an empty string -- an uninflated count is 0, well within
      // max: 3, so nothing should be flagged.
      expect(problems).toEqual([]);
    });

    it('counts only the non-empty runs for a zero-width-capable pattern, not every position', async () => {
      // 'aaa bbb aaa' has exactly 2 non-empty `a*` runs, but 8 total
      // matchAll matches once the zero-width matches between/around them
      // are included. Pinning min AND max to 2 turns that difference into
      // an observable pass/fail: an inflated count of 8 trips `max`, while
      // the true count of 2 satisfies both bounds exactly.
      const content = 'aaa bbb aaa\n';
      const rule = occurrenceRule('Expected exactly 2 (%s found, min %s).', 'paragraph', {
        pattern: 'a*',
        min: 2,
        max: 2,
      });
      const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');

      const problems = await occurrence.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });
  });

  describe('no-message fallback (programmatic NormalizedRule, bypassing validate())', () => {
    it('tooMany: falls back to "Found %s matches; expected at most %s." with COUNT then BOUND', async () => {
      const content = 'First sentence. Second sentence! Third sentence? Fourth sentence.\n';
      const rule: NormalizedRule = {
        name: 'test-occurrence-fallback-too-many',
        shortName: 'occurrence',
        severity: 'error',
        scope: 'paragraph',
        assertions: { occurrence: { pattern: '[.!?]', max: 3 } },
      };

      const { problems } = await runRules([{ path: 'test.md', content }], [rule]);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('Found 4 matches; expected at most 3.');
    });

    it('tooFew: falls back to "Found %s matches; expected at least %s." with COUNT then BOUND', async () => {
      const content = '## Getting Started\n';
      const rule: NormalizedRule = {
        name: 'test-occurrence-fallback-too-few',
        shortName: 'occurrence',
        severity: 'error',
        scope: 'heading',
        assertions: { occurrence: { pattern: ':$', min: 1 } },
      };

      const { problems } = await runRules([{ path: 'test.md', content }], [rule]);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toBe('Found 0 matches; expected at least 1.');
    });
  });
});
