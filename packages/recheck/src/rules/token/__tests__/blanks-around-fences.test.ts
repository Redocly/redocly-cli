import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('blanks-around-fences (MD031)', () => {
  const h = tokenRuleHarness('blanks-around-fences');
  const hNoListItems = tokenRuleHarness('blanks-around-fences', { listItems: false });

  it('passes a fence surrounded by blank lines', async () => {
    expect(await h.lint('Some text\n\n```\nCode block\n```\n\nMore text\n')).toEqual([]);
  });

  it('flags a fence missing a blank line above, exact line/column', async () => {
    const problems = await h.lint('Some text\n```\nCode block\n```\n\nMore text\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
    expect(problems[0].column).toBe(1);
  });

  it('flags a fence missing a blank line below', async () => {
    const problems = await h.lint('Some text\n\n```\nCode block\n```\nMore text\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(5);
  });

  it('flags both missing blank lines above and below in one document', async () => {
    const problems = await h.lint(
      'Some text\n```\nCode block\n```\n\n```\nAnother code block\n```\nSome more text\n'
    );
    expect(problems.map((p) => p.line)).toEqual([2, 8]);
  });

  it('does not flag a fence at the very start/end of the document', async () => {
    expect(await h.lint('```\nCode block\n```\n')).toEqual([]);
  });

  it('honors listItems: false to skip fences nested in list items', async () => {
    const md = '* Item\n  ```\n  code\n  ```\n* Item2\n';
    const problems = await h.lint(md);
    expect(problems.length).toBeGreaterThan(0);
    expect(await hNoListItems.lint(md)).toEqual([]);
  });

  it('produces the exact fixed output inserting a blank line above and below', async () => {
    const fixed = await h.fix('Some text\n```\nCode block\n```\nMore text\n');
    expect(fixed).toBe('Some text\n\n```\nCode block\n```\n\nMore text\n');
  });

  it('produces the exact fixed output for a blockquote-nested fence', async () => {
    const fixed = await h.fix('> Text\n> ```\n> code\n> ```\n> More\n');
    expect(fixed).toBe('> Text\n>\n> ```\n> code\n> ```\n>\n> More\n');
  });

  it('passes a document with no fenced code blocks', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});
