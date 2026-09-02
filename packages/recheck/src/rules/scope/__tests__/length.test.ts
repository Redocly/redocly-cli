import { describe, it, expect } from 'vitest';

import { validate } from '../../../config/validate.js';
import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule, LengthAssertion } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { length } from '../length.js';

// Builds a ScopeRuleContext filtered to the given scope predicate; there is no
// higher-level runner helper, so tests build the context directly and call
// length.execute().
function buildScopedContext(
  content: string,
  scopeFilter: (scope: string) => boolean
): ScopeRuleContext {
  const tree = parseMarkdown(content);
  const segments = extractScopes(tree, content).filter((segment) => scopeFilter(segment.scope));
  return { segments, content, tree };
}

function lengthRule(
  message: string | undefined,
  scope: string,
  options: LengthAssertion
): NormalizedRule {
  return {
    name: 'test-length',
    shortName: 'length',
    severity: 'error',
    message,
    scope,
    assertions: { length: options },
  };
}

describe('length assertion', () => {
  it('flags alt text over the character maximum', async () => {
    const content = '![' + 'a'.repeat(151) + '](/i.png)\n';
    const rule = lengthRule(undefined, 'alt', { unit: 'characters', max: 150 });
    const ctx = buildScopedContext(content, (scope) => scope === 'alt');

    const problems = await length.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('151');
    expect(problems[0].message).toContain('150');
  });

  it('does not flag alt text at the maximum', async () => {
    const content = '![' + 'a'.repeat(150) + '](/i.png)\n';
    const rule = lengthRule(undefined, 'alt', { unit: 'characters', max: 150 });
    const ctx = buildScopedContext(content, (scope) => scope === 'alt');

    const problems = await length.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  it('counts words for unit: words', async () => {
    const content = 'One two three four five six.\n';
    const rule = lengthRule(undefined, 'sentence', { unit: 'words', max: 5 });
    const ctx = buildScopedContext(content, (scope) => scope === 'sentence');

    const problems = await length.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('6');
  });

  it('does not count a leading bold label toward a sentence word count', async () => {
    // House style writes '**Label:** Description.' — the label is structure,
    // not part of the sentence being measured.
    const content = '**Setup:** One two three four five.\n';
    const rule = lengthRule(undefined, 'sentence', { unit: 'words', max: 5 });
    const ctx = buildScopedContext(content, (scope) => scope === 'sentence');

    const problems = await length.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  it('still counts the description after a bold label', async () => {
    const content = '**Setup:** One two three four five six.\n';
    const rule = lengthRule(undefined, 'sentence', { unit: 'words', max: 5 });
    const ctx = buildScopedContext(content, (scope) => scope === 'sentence');

    const problems = await length.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('6');
  });

  it('counts sentences for unit: sentences', async () => {
    const content = 'One. Two. Three. Four.\n';
    const rule = lengthRule(undefined, 'paragraph', { unit: 'sentences', max: 3 });
    const ctx = buildScopedContext(content, (scope) => scope === 'paragraph');

    const problems = await length.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
  });

  // Headings are emitted as heading.h1..h6 only; there is no bare 'heading'
  // scope to match against.
  it('flags a segment under min', async () => {
    const content = '# Hi\n';
    const rule = lengthRule(undefined, 'heading.h1', { unit: 'words', min: 2 });
    const ctx = buildScopedContext(content, (scope) => scope === 'heading.h1');

    const problems = await length.execute(rule, 'test.md', ctx);

    expect(problems).toHaveLength(1);
  });

  // Column 4 is where the heading text starts, past the '## ' marker.
  it('reports at the segment start', async () => {
    const content = '## Short\n';
    const rule = lengthRule(undefined, 'heading.h2', { unit: 'words', min: 3 });
    const ctx = buildScopedContext(content, (scope) => scope === 'heading.h2');

    const problems = await length.execute(rule, 'test.md', ctx);

    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(4);
  });

  // Zero matching segments (e.g. no heading at all) means nothing to
  // check, not a min-violation of an imaginary empty segment — same
  // convention as occurrence (see occurrence.test.ts).
  it('reports zero problems when the scope matches no segment at all, even for a min-bounded rule', async () => {
    const content = 'Just a paragraph, no heading anywhere.\n';
    const rule = lengthRule(undefined, 'heading.h1', { unit: 'words', min: 2 });
    const ctx = buildScopedContext(content, (scope) => scope === 'heading.h1');
    expect(ctx.segments).toEqual([]);

    const problems = await length.execute(rule, 'test.md', ctx);

    expect(problems).toEqual([]);
  });

  // Same recipe as buildScopedContext, but with `markdoc: true` -- a masked
  // segment's `maskedRanges` only exists when the parse knows about Markdoc
  // tags.
  function buildMarkdocContext(
    content: string,
    scopeFilter: (scope: string) => boolean
  ): ScopeRuleContext {
    const tree = parseMarkdown(content, { markdoc: true });
    const segments = extractScopes(tree, content).filter((segment) => scopeFilter(segment.scope));
    return { segments, content, tree };
  }

  describe('markdoc masking (flag on): `characters` excludes the masked tag span', () => {
    // A masked markdoc tag span is blanked to same-width spaces rather than
    // removed, so a raw `content.length` counts the invisible tag along with
    // the real prose: 36 characters for the 10 a reader actually sees.
    const content = '# Head text {% #averylonganchorname %}\n';

    it("sanity: the segment's masked content is 36 characters, 26 of them the tag", () => {
      const ctx = buildMarkdocContext(content, (scope) => scope === 'heading.h1');
      expect(ctx.segments[0].content.length).toBe(36);
      expect(ctx.segments[0].maskedRanges).toEqual([{ start: 10, end: 36 }]);
    });

    it('measures only the visible prose, not the mask standing in for the tag', async () => {
      const rule = lengthRule(undefined, 'heading.h1', { unit: 'characters', max: 9 });
      const ctx = buildMarkdocContext(content, (scope) => scope === 'heading.h1');

      const problems = await length.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('10');
      expect(problems[0].message).not.toContain('36');
    });

    it('does not flag when the visible prose is within bounds, even though the masked width alone would violate it', async () => {
      const rule = lengthRule(undefined, 'heading.h1', { unit: 'characters', max: 20 });
      const ctx = buildMarkdocContext(content, (scope) => scope === 'heading.h1');

      const problems = await length.execute(rule, 'test.md', ctx);

      expect(problems).toEqual([]);
    });

    it('a segment with no masking measures exactly content.length, unaffected by this change', async () => {
      const plain = '# Head text\n';
      const rule = lengthRule(undefined, 'heading.h1', { unit: 'characters', max: 8 });
      const ctx = buildMarkdocContext(plain, (scope) => scope === 'heading.h1');
      expect(ctx.segments[0].maskedRanges).toBeUndefined();

      const problems = await length.execute(rule, 'test.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('9'); // "Head text" is 9 characters
    });

    it('word counts are unaffected by masking either way', async () => {
      const under = lengthRule(undefined, 'heading.h1', { unit: 'words', max: 2 });
      const over = lengthRule(undefined, 'heading.h1', { unit: 'words', max: 1 });
      const ctx = buildMarkdocContext(content, (scope) => scope === 'heading.h1');

      // "Head text" is 2 words; the tag's own name and attribute text was
      // never tokenized as words either way.
      expect(await length.execute(under, 'test.md', ctx)).toEqual([]);
      const problems = await length.execute(over, 'test.md', ctx);
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('2');
    });
  });

  describe('no-message fallback (programmatic NormalizedRule, bypassing validate())', () => {
    it('tooLarge: falls back to "Segment is %s %s; at most %s allowed"', async () => {
      const content = '![' + 'a'.repeat(151) + '](/i.png)\n';
      const rule = lengthRule(undefined, 'alt', { unit: 'characters', max: 150 });
      const ctx = buildScopedContext(content, (scope) => scope === 'alt');

      const problems = await length.execute(rule, 'test.md', ctx);

      expect(problems[0].message).toBe('Segment is 151 characters; at most 150 allowed');
    });

    it('tooSmall: falls back to "Segment is %s %s; at least %s required"', async () => {
      const content = '# Hi\n';
      const rule = lengthRule(undefined, 'heading.h1', { unit: 'words', min: 2 });
      const ctx = buildScopedContext(content, (scope) => scope === 'heading.h1');

      const problems = await length.execute(rule, 'test.md', ctx);

      expect(problems[0].message).toBe('Segment is 1 words; at least 2 required');
    });
  });

  it('a custom message substitutes size, unit, and bound in that order', async () => {
    const content = '![' + 'a'.repeat(151) + '](/i.png)\n';
    const rule = lengthRule('Alt text is %s %s long (max %s).', 'alt', {
      unit: 'characters',
      max: 150,
    });
    const ctx = buildScopedContext(content, (scope) => scope === 'alt');

    const problems = await length.execute(rule, 'test.md', ctx);

    expect(problems[0].message).toBe('Alt text is 151 characters long (max 150).');
  });

  describe('validation', () => {
    function lengthConfig(options: Record<string, unknown>) {
      return {
        'recheck/test-rule': {
          severity: 'error' as const,
          message: 'Test message',
          assertions: { length: options },
        },
      };
    }

    it('errors when unit is missing, mentioning unit', async () => {
      const result = await validate(lengthConfig({ max: 150 }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('unit'))).toBe(true);
    });

    it('errors when unit is not one of the three literals', async () => {
      const result = await validate(lengthConfig({ unit: 'paragraphs', max: 150 }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('unit'))).toBe(true);
    });

    it('accepts each of the three unit values', async () => {
      for (const unit of ['characters', 'words', 'sentences']) {
        const result = await validate(lengthConfig({ unit, max: 150 }));
        expect(result.errors).toEqual([]);
        expect(result.isValid).toBe(true);
      }
    });

    it('errors when neither min nor max is set, mentioning min/max', async () => {
      const result = await validate(lengthConfig({ unit: 'characters' }));
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (error) => error.message.includes('min') && error.message.includes('max')
        )
      ).toBe(true);
    });

    it('accepts length with only min set', async () => {
      const result = await validate(lengthConfig({ unit: 'words', min: 2 }));
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts length with only max set', async () => {
      const result = await validate(lengthConfig({ unit: 'words', max: 10 }));
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects an unknown length option', async () => {
      const result = await validate(
        lengthConfig({ unit: 'characters', max: 150, unknownOption: true })
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('unknownOption'))).toBe(true);
    });

    it('errors when min is not a number', async () => {
      const result = await validate(lengthConfig({ unit: 'words', min: '2' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('min'))).toBe(true);
    });

    it('errors when max is not a number', async () => {
      const result = await validate(lengthConfig({ unit: 'words', max: '10' }));
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('max'))).toBe(true);
    });

    describe('validation rejects length with min > max', () => {
      it('errors when min exceeds max, mentioning both bounds', async () => {
        const result = await validate(lengthConfig({ unit: 'words', min: 10, max: 2 }));
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some(
            (error) => error.message.includes('min') && error.message.includes('max')
          )
        ).toBe(true);
      });

      it('still accepts min === max (an exact-size requirement)', async () => {
        const result = await validate(lengthConfig({ unit: 'words', min: 5, max: 5 }));
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    // Final-review fix (Item 5's "while there" follow-up): a segment's
    // character/word/sentence count can never be negative, so `min: 0` (or
    // less) can never be violated by a real segment, and a negative `max`
    // is violated by every real segment -- neither is a meaningful bound.
    // Both are now rejected, same reasoning (and same shared
    // validateCountBounds helper) as list-length's identical fix.
    describe('validation rejects a non-positive min, a negative max, and non-integer bounds', () => {
      it('rejects min: 0 (can never be violated by a real segment)', async () => {
        const result = await validate(lengthConfig({ unit: 'words', min: 0 }));
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some(
            (error) => error.message.includes('min') && error.message.includes('positive')
          )
        ).toBe(true);
      });

      it('rejects a negative max (always violated by every real segment)', async () => {
        const result = await validate(lengthConfig({ unit: 'words', max: -1 }));
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some(
            (error) => error.message.includes('max') && error.message.includes('non-negative')
          )
        ).toBe(true);
      });

      it('rejects a non-integer min', async () => {
        const result = await validate(lengthConfig({ unit: 'words', min: 2.5 }));
        expect(result.isValid).toBe(false);
        expect(result.errors.some((error) => error.message.includes('min'))).toBe(true);
      });

      it('rejects a non-integer max', async () => {
        const result = await validate(lengthConfig({ unit: 'words', max: 10.5 }));
        expect(result.isValid).toBe(false);
        expect(result.errors.some((error) => error.message.includes('max'))).toBe(true);
      });

      it('still accepts max: 0 alone (a real, meaningful "must be empty" bound, unlike a negative max)', async () => {
        const result = await validate(lengthConfig({ unit: 'characters', max: 0 }));
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('still accepts a positive integer min and a non-negative integer max', async () => {
        const result = await validate(lengthConfig({ unit: 'words', min: 1, max: 10 }));
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });
  });

  // length's fallback messages carry three `%s` placeholders (size, unit,
  // bound). The token-rule single-placeholder constraint does not apply to
  // scope rules, which build Problem.message themselves via formatTemplate.
  describe('message placeholder cap is 3', () => {
    it('a 3-placeholder custom message validates', async () => {
      const result = await validate({
        'recheck/alt-length': {
          severity: 'error',
          message: 'Segment is %s %s (max %s).',
          assertions: { length: { unit: 'characters', max: 150 } },
        },
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('a 4-placeholder custom message errors', async () => {
      const result = await validate({
        'recheck/alt-length': {
          severity: 'error',
          message: 'Segment is %s %s (max %s, extra %s).',
          assertions: { length: { unit: 'characters', max: 150 } },
        },
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.message.includes('%s'))).toBe(true);
    });
  });
});
