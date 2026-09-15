import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('emphasis-style (MD049)', () => {
  const h = tokenRuleHarness('emphasis-style');
  const hAsterisk = tokenRuleHarness('emphasis-style', { style: 'asterisk' });
  const hUnderscore = tokenRuleHarness('emphasis-style', { style: 'underscore' });

  it('passes consistent asterisk emphasis (default style)', async () => {
    expect(await h.lint('*a* and *b*.\n')).toEqual([]);
  });

  it('flags inconsistent emphasis style, exact line/column', async () => {
    const problems = await h.lint('*a* and _b_.\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(9);
    expect(problems[1].column).toBe(11);
  });

  it('fixes inconsistent emphasis to the first-seen style, exact output', async () => {
    const fixed = await h.fix('*a* and _b_.\n');
    expect(fixed).toBe('*a* and *b*.\n');
  });

  it('honors style: asterisk by flagging underscore emphasis', async () => {
    const problems = await hAsterisk.lint('_Text_\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].message).toContain('Expected: asterisk; Actual: underscore');
  });

  it('honors style: underscore by flagging asterisk emphasis', async () => {
    const problems = await hUnderscore.lint('*Text*\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].message).toContain('Expected: underscore; Actual: asterisk');
  });

  it('does not flag mid-word underscore emphasis when style is underscore (intraword restriction)', async () => {
    // Emphasis within a word is restricted to asterisk to avoid unwanted
    // emphasis for words containing internal underscores.
    expect(await hUnderscore.lint('like_this_one\n')).toEqual([]);
  });

  it('does not flag strong (**/__) tokens', async () => {
    expect(await h.lint('**bold** text.\n')).toEqual([]);
  });

  it('passes a document with no emphasis', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});
