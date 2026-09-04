import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('code-fence-style (MD048)', () => {
  const h = tokenRuleHarness('code-fence-style');
  const hBacktick = tokenRuleHarness('code-fence-style', { style: 'backtick' });
  const hTilde = tokenRuleHarness('code-fence-style', { style: 'tilde' });

  it('passes when all code fences use the same style', async () => {
    expect(await h.lint('```js\ncode\n```\n\n```ruby\nmore\n```\n')).toEqual([]);
  });

  it('flags a fence that differs from the first (consistent), exact line/column', async () => {
    const problems = await h.lint('```js\ncode\n```\n\n~~~ruby\nmore\n~~~\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(5);
    expect(problems[0].column).toBe(1);
    expect(problems[0].message).toContain('Expected: backtick; Actual: tilde');
  });

  it('honors an explicit style option (backtick)', async () => {
    const problems = await hBacktick.lint('~~~js\ncode\n~~~\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain('Expected: backtick; Actual: tilde');
  });

  it('honors an explicit style option (tilde)', async () => {
    const problems = await hTilde.lint('```js\ncode\n```\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain('Expected: tilde; Actual: backtick');
  });

  it('passes a document with no code fences', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});
