import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-multiple-space-atx (MD019)', () => {
  const h = tokenRuleHarness('no-multiple-space-atx');

  it('passes a heading with a single space after the hash', async () => {
    expect(await h.lint('# Heading 1\n\n## Heading 2\n')).toEqual([]);
  });

  it('flags multiple spaces after the hash with position', async () => {
    const problems = await h.lint('#  Heading 1\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(3);
  });

  it('does not flag closed-atx multiple spaces (handled by MD021)', async () => {
    expect(await h.lint('##  Heading 2  ##\n')).toEqual([]);
  });

  it('fixes by collapsing the extra spaces after the hash to one', async () => {
    expect(await h.fix('#  Heading 1\n')).toBe('# Heading 1\n');
  });
});
