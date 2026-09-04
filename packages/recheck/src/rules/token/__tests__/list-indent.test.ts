import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('list-indent (MD005)', () => {
  const h = tokenRuleHarness('list-indent');

  it('passes a list whose sibling items share the same indentation', async () => {
    expect(
      await h.lint('* Item 1\n  * Nested Item 1\n  * Nested Item 2\n  * Nested Item 3\n')
    ).toEqual([]);
  });

  it('flags a misaligned unordered sibling item with exact line/column', async () => {
    const problems = await h.lint('* Item 1\n  * Nested Item 1\n  * Nested Item 2\n   * Bad\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(4);
    expect(problems[0].column).toBe(1);
    expect(problems[0].message).toContain('Expected: 2; Actual: 3');
  });

  it('does not provide a fix for unordered lists (MD007 handles that scenario)', async () => {
    const fixed = await h.fix('* Item 1\n  * Nested Item 1\n  * Nested Item 2\n   * Bad\n');
    expect(fixed).toBe('* Item 1\n  * Nested Item 1\n  * Nested Item 2\n   * Bad\n');
  });

  it('accepts left-aligned ordered list markers (same starting column)', async () => {
    expect(await h.lint('8. Item\n9. Item\n10. Item\n11. Item\n')).toEqual([]);
  });

  it('accepts right-aligned ordered list markers (same ending column)', async () => {
    expect(await h.lint(' 8. Item\n 9. Item\n10. Item\n11. Item\n')).toEqual([]);
  });

  it('flags and fixes a misaligned ordered list item', async () => {
    const problems = await h.lint('1. Item\n2. Item\n  3. Bad\n');
    expect(problems.length).toBeGreaterThanOrEqual(1);
    const fixed = await h.fix('1. Item\n2. Item\n  3. Bad\n');
    expect(fixed).toBe('1. Item\n2. Item\n3. Bad\n');
  });
});
