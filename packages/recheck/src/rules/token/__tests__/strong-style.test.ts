import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('strong-style (MD050)', () => {
  const h = tokenRuleHarness('strong-style');
  const hAsterisk = tokenRuleHarness('strong-style', { style: 'asterisk' });
  const hUnderscore = tokenRuleHarness('strong-style', { style: 'underscore' });

  it('passes consistent asterisk strong (default style)', async () => {
    expect(await h.lint('**a** and **b**.\n')).toEqual([]);
  });

  it('flags inconsistent strong style, exact line/column', async () => {
    const problems = await h.lint('**a** and __b__.\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(11);
    expect(problems[1].column).toBe(14);
  });

  it('fixes inconsistent strong to the first-seen style, exact output', async () => {
    const fixed = await h.fix('**a** and __b__.\n');
    expect(fixed).toBe('**a** and **b**.\n');
  });

  it('honors style: asterisk by flagging underscore strong', async () => {
    const problems = await hAsterisk.lint('__Text__\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].message).toContain('Expected: asterisk; Actual: underscore');
  });

  it('honors style: underscore by flagging asterisk strong', async () => {
    const problems = await hUnderscore.lint('**Text**\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].message).toContain('Expected: underscore; Actual: asterisk');
  });

  it('does not flag mid-word underscore strong when style is underscore (intraword restriction)', async () => {
    expect(await hUnderscore.lint('like__this__one\n')).toEqual([]);
  });

  it('does not flag emphasis (*/_) tokens', async () => {
    expect(await h.lint('*italic* text.\n')).toEqual([]);
  });

  it('passes a document with no strong text', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});
