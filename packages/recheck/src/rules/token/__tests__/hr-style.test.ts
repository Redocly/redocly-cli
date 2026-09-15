import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('hr-style (MD035)', () => {
  const h = tokenRuleHarness('hr-style');
  const hCustomStyle = tokenRuleHarness('hr-style', { style: '* * *' });

  it('passes when all thematic breaks use the same style', async () => {
    expect(await h.lint('Text\n\n---\n\nMore text\n\n---\n')).toEqual([]);
  });

  it('flags a thematic break that differs from the first (consistent), exact line/column', async () => {
    const problems = await h.lint('Text\n\n---\n\nMore text\n\n***\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(7);
    expect(problems[0].message).toContain('Expected: ---; Actual: ***');
  });

  it('honors an explicit style option', async () => {
    const problems = await hCustomStyle.lint('Text\n\n---\n\nMore text\n\n---\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].line).toBe(3);
    expect(problems[1].line).toBe(7);
  });

  it('passes an empty document with no thematic breaks', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});
