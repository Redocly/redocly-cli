import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-missing-space-closed-atx (MD020)', () => {
  const h = tokenRuleHarness('no-missing-space-closed-atx');

  it('passes a closed atx heading with spaces on both sides', async () => {
    expect(await h.lint('# Heading 1 #\n\n## Heading 2 ##\n')).toEqual([]);
  });

  it('flags a missing left space with position', async () => {
    const problems = await h.lint('#Heading 1#\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(1);
  });

  it('flags a missing right space only', async () => {
    const problems = await h.lint('# Heading 1#\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });

  it('fixes by inserting spaces around the heading text', async () => {
    expect(await h.fix('#Heading 1#\n')).toBe('# Heading 1 #\n');
  });
});
