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

  // A nested list is checked on its own. Only the one-item child is reported.
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

  // `min: 0` means no minimum. validate() rejects it, but the rule itself must still behave.
  it('treats an explicit min of 0 as no floor (a single-item list is not flagged) -- rule-level behavior, bypassing validate()', async () => {
    const hMin0 = tokenRuleHarness('list-length', { min: 0 });
    expect(await hMin0.lint('- only item\n')).toEqual([]);
  });

  // A negative `max` flags every list. validate() rejects it, but the rule itself must still
  // behave.
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
