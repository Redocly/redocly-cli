import { describe, it, expect } from 'vitest';

import { runRules } from '../../../core/runner.js';
import type { NormalizedRule } from '../../../types/index.js';
import { conditional } from '../conditional.js';
import {
  buildScopedContext,
  buildWholeFileContext,
  expectInvalidOptions,
  expectValidOptions,
} from './helpers.js';

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
    // `text` is the whole line containing the match; `match` is just the matched text.
    expect(problems.map((p) => p.text)).toEqual(['TODO: fix this.', 'TODO: fix that too.']);
  });

  it('reports zero problems when `second` appears ANYWHERE in the file, even outside the rule scope (inside a code block while scope is `paragraph`)', async () => {
    const content = 'TODO: fix this.\n\n```\nDONE\n```\n';
    const rule = conditionalRule(MESSAGE, { first: 'TODO', second: 'DONE' }, 'paragraph');
    const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');
    expect(ctx.segments.some((segment) => /TODO/.test(segment.content))).toBe(true);
    // `second` is only in the code fence, not in any scanned segment.
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
    // Each sentence overlaps its paragraph, so every match is found twice. It must be reported once.
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

  // An empty match (from a pattern like 'x*') must not be reported.
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

  // An empty match for `second` (from a pattern like 'x*') does not count as `second` being present.
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
    // A heading's content starts after the '## ', so the column needs the segment's start column.
    const content = '## TODO here\n';
    const rule = conditionalRule(MESSAGE, { first: 'TODO', second: 'DONE' }, 'heading');
    const ctx = buildScopedContext(content, (scope) => scope.startsWith('heading.'));

    const problems = await conditional.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    // '## TODO here': 'TODO' starts at source column 4.
    expect(problems[0].column).toBe(4);
    expect(problems[0].text).toBe('TODO here');
    expect(problems[0].match).toBe('TODO');
  });

  // The fallback message must have one `%s` for each value, and the rule has no `message`.
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
    it('accepts a well-formed config', async () => {
      await expectValidOptions('conditional', { first: 'TODO', second: 'DONE', ignoreCase: true });
    });

    it.each<[string, unknown, string]>([
      ['a config missing "first"', { second: 'DONE' }, 'first'],
      ['a config missing "second"', { first: 'TODO' }, 'second'],
      ['an empty string "first"', { first: '', second: 'DONE' }, 'first'],
      ['an empty string "second"', { first: 'TODO', second: '' }, 'second'],
      ['a non-string "first"', { first: 42, second: 'DONE' }, 'first'],
      ['a non-string "second"', { first: 'TODO', second: 42 }, 'second'],
      [
        'an unknown option',
        { first: 'TODO', second: 'DONE', unknownOption: true },
        'unknownOption',
      ],
      [
        'a non-boolean ignoreCase',
        { first: 'TODO', second: 'DONE', ignoreCase: 'yes' },
        'ignoreCase',
      ],
    ])('rejects %s', async (_label, options, mention) => {
      await expectInvalidOptions('conditional', options, mention);
    });
  });
});
