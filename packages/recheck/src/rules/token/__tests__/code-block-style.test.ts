import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('code-block-style (MD046)', () => {
  const h = tokenRuleHarness('code-block-style');
  const hFenced = tokenRuleHarness('code-block-style', { style: 'fenced' });
  const hIndented = tokenRuleHarness('code-block-style', { style: 'indented' });

  it('passes when all code blocks use the same style', async () => {
    expect(await h.lint('```js\ncode\n```\n\n```ruby\nmore\n```\n')).toEqual([]);
  });

  it('flags a block that differs from the first (consistent), exact line/column', async () => {
    const problems = await h.lint('```js\ncode\n```\n\n    indented\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(5);
    expect(problems[0].column).toBe(1);
    expect(problems[0].message).toContain('Expected: fenced; Actual: indented');
  });

  it('honors an explicit style option (fenced)', async () => {
    const problems = await hFenced.lint('    indented\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain('Expected: fenced; Actual: indented');
  });

  it('honors an explicit style option (indented)', async () => {
    const problems = await hIndented.lint('```js\ncode\n```\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain('Expected: indented; Actual: fenced');
  });

  it('passes a document with no code blocks', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});
