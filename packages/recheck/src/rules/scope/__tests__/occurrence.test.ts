import { describe, it, expect } from 'vitest';

import { validate } from '../../../config/validate.js';
import { runRules } from '../../../core/runner.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { occurrence } from '../occurrence.js';

// Builds a rule context with only the segments whose scope matches the filter.
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
    // 4 sentence-ending marks in a paragraph, max 3.
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
    // No heading means no segments, which is nothing to check rather than a min violation.
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

  // Without a `pattern`, the empty regex matches everywhere: a rule with `max` flags every segment and a rule with `min` never fires.
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

  // An inverted range (min > max) flags every segment, so it is rejected.
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

  // A non-numeric `min` or `max` (like "two") makes the comparison always false, so it is rejected.
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

  // A pattern that can match nothing (like `a*`) matches at every position. Those empty matches must not be counted.
  describe('zero-width matches do not inflate the count', () => {
    it('reports zero problems for a zero-width-only pattern (no "a" in the text)', async () => {
      const content = 'bbb here now\n';
      const rule = occurrenceRule('Too many (%s found, max %s).', 'paragraph', {
        pattern: 'a*',
        max: 3,
      });
      const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');

      const problems = await occurrence.execute(rule, 'test.md', ctx);

      // Every position matches `a*` with an empty string, so the real count is 0 and nothing is flagged.
      expect(problems).toEqual([]);
    });

    it('counts only the non-empty runs for a zero-width-capable pattern, not every position', async () => {
      // 'aaa bbb aaa' has 2 real runs of `a*` but 8 matches with the empty ones. With min and max both 2, an inflated count of 8 fails.
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

  // A rule built in code has no `message`, so the fallback message is used.
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
