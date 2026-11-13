import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-trailing-punctuation (MD026)', () => {
  const h = tokenRuleHarness('no-trailing-punctuation');

  it('passes a heading with no trailing punctuation', async () => {
    expect(await h.lint('# This is a heading\n')).toEqual([]);
  });

  it('flags a heading ending in a period with position and detail', async () => {
    const problems = await h.lint('# This is a heading.\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain("Punctuation: '.'");
  });

  it('allows a question mark by default', async () => {
    expect(await h.lint('# FAQ?\n')).toEqual([]);
  });

  it('honors a custom punctuation option', async () => {
    const custom = tokenRuleHarness('no-trailing-punctuation', { punctuation: '.,;:!' });
    expect(await custom.lint('# FAQ!\n')).toHaveLength(1);
  });

  it('ignores a trailing HTML entity reference', async () => {
    expect(await h.lint('# Copyright &copy;\n')).toEqual([]);
  });

  it('fixes by removing the trailing punctuation', async () => {
    expect(await h.fix('# This is a heading.\n')).toBe('# This is a heading\n');
  });
});
