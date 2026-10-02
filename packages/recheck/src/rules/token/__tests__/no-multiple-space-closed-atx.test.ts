import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-multiple-space-closed-atx (MD021)', () => {
  const h = tokenRuleHarness('no-multiple-space-closed-atx');

  it('passes a closed atx heading with single spaces', async () => {
    expect(await h.lint('# Heading 1 #\n\n## Heading 2 ##\n')).toEqual([]);
  });

  it('flags multiple spaces on the left side', async () => {
    const problems = await h.lint('#  Heading 1 #\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });

  it('flags multiple spaces on both sides as two problems', async () => {
    const problems = await h.lint('#  Heading 1  #\n');
    expect(problems).toHaveLength(2);
  });

  it('does not flag plain (non-closed) atx headings', async () => {
    expect(await h.lint('#  Heading 1\n')).toEqual([]);
  });

  it('fixes multiple spaces on both sides down to one', async () => {
    expect(await h.fix('#  Heading 1  #\n')).toBe('# Heading 1 #\n');
  });
});
