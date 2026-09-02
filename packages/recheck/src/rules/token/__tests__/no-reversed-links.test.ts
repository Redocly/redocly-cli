import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-reversed-links (MD011)', () => {
  const h = tokenRuleHarness('no-reversed-links');

  it('passes correct link syntax', async () => {
    expect(await h.lint('[Correct link syntax](https://www.example.com/)\n')).toEqual([]);
  });

  it('flags reversed link syntax, exact line/column', async () => {
    const problems = await h.lint('(Incorrect link syntax)[https://www.example.com/]\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(1);
    expect(problems[0].match).toBe('(Incorrect link syntax)[https://www.example.com/]');
  });

  it('does not flag Markdown Extra footnote references', async () => {
    expect(await h.lint('For (example)[^1]\n')).toEqual([]);
  });

  it('does not flag reversed-looking syntax inside a code span', async () => {
    expect(await h.lint('`(text)[dest]`\n')).toEqual([]);
  });

  it('does not flag reversed-looking syntax inside a fenced code block', async () => {
    expect(await h.lint('```\n(text)[dest]\n```\n')).toEqual([]);
  });

  it('produces the exact fixed output swapping [] and ()', async () => {
    const fixed = await h.fix('(Incorrect link syntax)[https://www.example.com/]\n');
    expect(fixed).toBe('[Incorrect link syntax](https://www.example.com/)\n');
  });

  it('passes a document with no links', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});
