import { describe, it, expect } from 'vitest';

import { runRules } from '../../../core/runner.js';
import type { NormalizedRule } from '../../../types/index.js';
import { occurrence } from '../occurrence.js';
import { buildScopedContext, expectInvalidOptions, expectValidOptions } from './helpers.js';

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

  describe('validation', () => {
    it.each<[string, Record<string, unknown>]>([
      ['only max', { pattern: '[.!?]', max: 3 }],
      ['only min', { pattern: '[.!?]', min: 1 }],
      ['min === max (an exact-count requirement)', { pattern: '[.!?]', min: 3, max: 3 }],
      ['numeric min and max', { pattern: ',', min: 1, max: 3 }],
    ])('accepts %s', async (_label, options) => {
      await expectValidOptions('occurrence', options);
    });

    it.each<[string, Record<string, unknown>, ...string[]]>([
      ['neither min nor max', { pattern: '[.!?]' }, 'min', 'max'],
      ['an unknown option', { pattern: '[.!?]', max: 3, unknownOption: true }, 'unknownOption'],
      // Without a `pattern`, the empty regex matches everywhere: `max` flags every segment and `min` never fires.
      ['a missing pattern', { min: 1 }, 'pattern'],
      ['an empty pattern', { pattern: '', max: 3 }, 'pattern'],
      ['a non-string pattern', { pattern: 42, max: 3 }, 'pattern'],
      // An inverted range flags every segment.
      ['min greater than max', { pattern: '[.!?]', min: 5, max: 3 }, 'min', 'max'],
      // A non-numeric bound makes the comparison always false.
      ['a non-number max', { pattern: ',', max: 'two' }, 'max', 'number'],
      ['a non-number min', { pattern: ',', min: '2' }, 'min', 'number'],
    ])('rejects %s', async (_label, options, ...mentions) => {
      await expectInvalidOptions('occurrence', options, ...mentions);
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
