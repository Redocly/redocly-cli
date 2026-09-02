import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-missing-space-atx (MD018)', () => {
  const h = tokenRuleHarness('no-missing-space-atx');

  it('passes headings with a space after the hash', async () => {
    expect(await h.lint('# Heading 1\n\n## Heading 2\n')).toEqual([]);
  });

  it('flags a missing space with position and context', async () => {
    const problems = await h.lint('#Heading 1\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(1);
  });

  it('ignores lines inside fenced code blocks', async () => {
    expect(await h.lint('```\n#NotAHeading\n```\n')).toEqual([]);
  });

  it('fixes by inserting a single space after the hash sequence', async () => {
    expect(await h.fix('#Heading 1\n')).toBe('# Heading 1\n');
  });
});
