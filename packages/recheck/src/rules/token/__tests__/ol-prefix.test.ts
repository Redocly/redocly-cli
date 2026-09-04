import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('ol-prefix (MD029)', () => {
  const h = tokenRuleHarness('ol-prefix');

  it('passes a 1/1/1 list under the default one_or_ordered style', async () => {
    expect(await h.lint('1. Do this.\n1. Do that.\n1. Done.\n')).toEqual([]);
  });

  it('passes a 1/2/3 list under the default one_or_ordered style', async () => {
    expect(await h.lint('1. Do this.\n2. Do that.\n3. Done.\n')).toEqual([]);
  });

  it('passes a 0/1/2 list under the default one_or_ordered style', async () => {
    expect(await h.lint('0. Do this.\n1. Do that.\n2. Done.\n')).toEqual([]);
  });

  it('flags a list that is neither 1/1/1 nor incrementing, with exact line/column', async () => {
    const problems = await h.lint('1. Do this.\n3. Done.\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
    expect(problems[0].column).toBe(1);
    expect(problems[0].message).toContain('Expected: 2; Actual: 3');
  });

  it('style: one requires every item to be "1."', async () => {
    const one = tokenRuleHarness('ol-prefix', { style: 'one' });
    expect(await one.lint('1. Do this.\n1. Do that.\n1. Done.\n')).toEqual([]);
    const problems = await one.lint('1. Do this.\n2. Do that.\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('Expected: 1; Actual: 2');
  });

  it('style: ordered requires strictly incrementing prefixes starting at 1', async () => {
    const ordered = tokenRuleHarness('ol-prefix', { style: 'ordered' });
    expect(await ordered.lint('1. Do this.\n2. Do that.\n3. Done.\n')).toEqual([]);
    const problems = await ordered.lint('1. Do this.\n1. Do that.\n1. Done.\n');
    expect(problems).toHaveLength(2);
  });

  it('style: zero requires every item to be "0."', async () => {
    const zero = tokenRuleHarness('ol-prefix', { style: 'zero' });
    expect(await zero.lint('0. Do this.\n0. Do that.\n0. Done.\n')).toEqual([]);
    const problems = await zero.lint('1. Do this.\n1. Do that.\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].message).toContain('Expected: 0; Actual: 1');
  });

  it('fixes a broken incrementing sequence back to consecutive numbers', async () => {
    const ordered = tokenRuleHarness('ol-prefix', { style: 'ordered' });
    const fixed = await ordered.fix('1. Do this.\n3. Done.\n');
    expect(fixed).toBe('1. Do this.\n2. Done.\n');
  });

  it('fixes a one_or_ordered list of a 1/1/1 shape by normalizing to all 1s when a later item breaks it', async () => {
    const fixed = await h.fix('1. Do this.\n1. Do that.\n3. Done.\n');
    // 1/1/x: second value !== 1 is false (it IS 1), so incrementing stays
    // false and expected stays "one" (1) throughout.
    expect(fixed).toBe('1. Do this.\n1. Do that.\n1. Done.\n');
  });

  it('fixes a one_or_ordered list of a 1/2/x shape by continuing the increment', async () => {
    const fixed = await h.fix('1. Do this.\n2. Do that.\n5. Done.\n');
    expect(fixed).toBe('1. Do this.\n2. Do that.\n3. Done.\n');
  });

  it('treats 0-padded numeric text by its numeric value, not a start-at-1 exemption', async () => {
    // doc/md029.md's "0-prefixing for uniform indentation" example
    // (08/09/10/11) is NOT actually exempted by the upstream CODE: `style:
    // ordered` always expects the sequence to start at 1 unless the first
    // item's *numeric* value is 0 (a literal "0."), so 08/09/10/11 (parsed
    // as 8/9/10/11) mismatches an expected 1/2/3/4 sequence. Ported
    // faithfully from the code, not the doc's prose.
    const ordered = tokenRuleHarness('ol-prefix', { style: 'ordered' });
    const problems = await ordered.lint('08. Item\n09. Item\n10. Item\n11. Item\n');
    expect(problems).toHaveLength(4);
    expect(problems[0].message).toContain('Expected: 1; Actual: 8');
  });
});
