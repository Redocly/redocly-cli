import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-multiple-blanks (MD012)', () => {
  const h = tokenRuleHarness('no-multiple-blanks');

  it('passes single blank lines between paragraphs', async () => {
    expect(await h.lint('Some text here\n\nSome more text here\n')).toEqual([]);
  });

  it('flags multiple consecutive blank lines, exact line/column', async () => {
    const problems = await h.lint('Some text here\n\n\nSome more text here\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].column).toBe(1);
    expect(problems[0].message).toContain('Expected: 1; Actual: 2');
  });

  it('honors a custom maximum option', async () => {
    const hMax2 = tokenRuleHarness('no-multiple-blanks', { maximum: 2 });
    expect(await hMax2.lint('Text\n\n\nMore text\n')).toEqual([]);
    const problems = await hMax2.lint('Text\n\n\n\nMore text\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(4);
  });

  it('does not trigger for multiple blank lines inside a fenced code block', async () => {
    const md = '```text\nline1\n\n\nline2\n```\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('fixes multiple blank lines by deleting the offending lines', async () => {
    const fixed = await h.fix('Some text here\n\n\nSome more text here\n');
    expect(fixed).toBe('Some text here\n\nSome more text here\n');
  });
});
