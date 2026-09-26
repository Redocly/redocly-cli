import { describe, it, expect } from 'vitest';

import { validate } from '../../../config/validate.js';
import { tokenRuleHarness } from './harness.js';

const h = tokenRuleHarness('list-length');

describe('list-length', () => {
  it('flags a single-item list under the default min of 2', async () => {
    const problems = await h.lint('- only item\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toBe('List has 1 item(s) (minimum 2)');
  });

  it('does not flag a two-item list under the default', async () => {
    expect(await h.lint('- one\n- two\n')).toEqual([]);
  });

  it('flags a list exceeding max', async () => {
    const hMax = tokenRuleHarness('list-length', { max: 7 });
    const md = '- 1\n- 2\n- 3\n- 4\n- 5\n- 6\n- 7\n- 8\n';
    const problems = await hMax.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe('List has 8 item(s) (maximum 7)');
  });

  it('does not flag a list at exactly max', async () => {
    const hMax = tokenRuleHarness('list-length', { max: 7 });
    const md = '- 1\n- 2\n- 3\n- 4\n- 5\n- 6\n- 7\n';
    expect(await hMax.lint(md)).toEqual([]);
  });

  // The arbiter test: a nested sublist is its own subject, distinct from
  // blanks-around-lists (MD032), which folds nested lists into their
  // parent by design. The two-item parent must NOT be reported; only the
  // one-item child, at its own startLine, should be.
  it('evaluates a nested sublist as its own list', async () => {
    const md = '- parent one\n- parent two\n  - lone child\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].message).toBe('List has 1 item(s) (minimum 2)');
  });

  it('counts ordered lists too', async () => {
    const problems = await h.lint('1. only\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe('List has 1 item(s) (minimum 2)');
  });

  it('does not flag an ordered list with enough items', async () => {
    expect(await h.lint('1. one\n2. two\n')).toEqual([]);
  });

  it('respects an explicit min override', async () => {
    const hMin3 = tokenRuleHarness('list-length', { min: 3 });
    expect(await hMin3.lint('- one\n- two\n')).toHaveLength(1);
    expect(await hMin3.lint('- one\n- two\n- three\n')).toEqual([]);
  });

  // `min: 0` passes straight through the RULE's own arithmetic (`ctx.config.min
  // ?? 2` only falls back to the literal default 2 when `min` is
  // null/undefined, and `0` is neither), so this pins the mechanical
  // fallback behavior of list-length.ts's check() itself when reached
  // directly (tokenRuleHarness bypasses validate() entirely). validate()
  // itself now REJECTS `min: 0` (see the "validate — list-length options"
  // describe block below) precisely because this is its real runtime
  // effect: no floor at all, since a real item count is never violated by
  // it.
  it('treats an explicit min of 0 as no floor (a single-item list is not flagged) -- rule-level behavior, bypassing validate()', async () => {
    const hMin0 = tokenRuleHarness('list-length', { min: 0 });
    expect(await hMin0.lint('- only item\n')).toEqual([]);
  });

  // Same bypass-validate() caveat as above: `max === undefined` is the only
  // guard in list-length.ts's check(), so a negative `max` passes through
  // as a literal negative number and every real list (count is always >= 1)
  // exceeds it. validate() now rejects this shape too.
  it('treats a negative max as "every list is too long" (even a single-item list is flagged) -- rule-level behavior, bypassing validate()', async () => {
    const hMaxNeg = tokenRuleHarness('list-length', { min: 0, max: -1 });
    const problems = await hMaxNeg.lint('- only item\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe('List has 1 item(s) (maximum -1)');
  });
});

describe('validate — list-length options', () => {
  function listLengthConfig(options: Record<string, unknown>) {
    return {
      'recheck/test-rule': {
        severity: 'error',
        message: 'Test message',
        assertions: { 'list-length': options },
      },
    };
  }

  it('accepts an empty options object (min defaults to 2)', async () => {
    const result = await validate(listLengthConfig({}));
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  // The present-but-undefined option-acceptance test (max is declared in
  // `defaults` with value `undefined`, same as line-length/required-headings)
  // lives in src/config/__tests__/validate.test.ts's "validate — unknown
  // options on token rules" describe block, alongside its siblings.

  it('rejects a non-number min', async () => {
    const result = await validate(listLengthConfig({ min: '2' }));
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (error) => error.message.includes('min') && error.message.includes('number')
      )
    ).toBe(true);
  });

  it('rejects a non-number max', async () => {
    const result = await validate(listLengthConfig({ max: 'seven' }));
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (error) => error.message.includes('max') && error.message.includes('number')
      )
    ).toBe(true);
  });

  it('rejects min > max', async () => {
    const result = await validate(listLengthConfig({ min: 5, max: 3 }));
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((error) => error.message.includes('min') && error.message.includes('max'))
    ).toBe(true);
  });

  it('accepts min === max (an exact-count requirement)', async () => {
    const result = await validate(listLengthConfig({ min: 3, max: 3 }));
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  // Final-review fix (Item 5's "while there" follow-up): validateListLengthOptions
  // USED to only check type (must be a number) and the min <= max
  // relationship, with no `>= 0` floor -- so 0 and negative bounds were both
  // "valid" as far as validate() was concerned, even though a list's item
  // count can never be negative, which makes `min: 0` never violated (see
  // the `list-length` describe block above: "treats an explicit min of 0 as
  // no floor") and a negative `max` always violated ("treats a negative max
  // as 'every list is too long'"). Neither is a meaningful bound, so
  // validate() now rejects both -- see validateCountBounds in validate.ts.
  it('rejects an explicit min of 0 (can never be violated by a real item count)', async () => {
    const result = await validate(listLengthConfig({ min: 0 }));
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (error) => error.message.includes('min') && error.message.includes('positive')
      )
    ).toBe(true);
  });

  it('rejects a negative max (always violated by every real item count)', async () => {
    const result = await validate(listLengthConfig({ min: 1, max: -1 }));
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (error) => error.message.includes('max') && error.message.includes('non-negative')
      )
    ).toBe(true);
  });

  it('rejects a non-integer min', async () => {
    const result = await validate(listLengthConfig({ min: 2.5 }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('min'))).toBe(true);
  });

  it('rejects a non-integer max', async () => {
    const result = await validate(listLengthConfig({ max: 7.5 }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('max'))).toBe(true);
  });

  it('still accepts a positive integer min and a non-negative integer max', async () => {
    const result = await validate(listLengthConfig({ min: 1, max: 5 }));
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('still accepts max: 0 alone (a real, meaningful "must be empty" bound, unlike a negative max)', async () => {
    const result = await validate(listLengthConfig({ max: 0 }));
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects an unknown option', async () => {
    const result = await validate(listLengthConfig({ min: 2, bogus: true }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.message.includes('bogus'))).toBe(true);
  });
});
