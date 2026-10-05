import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('blanks-around-lists (MD032)', () => {
  const h = tokenRuleHarness('blanks-around-lists');

  it('passes a list surrounded by blank lines', async () => {
    expect(await h.lint('Some text\n\n* List item\n* List item\n\nMore text\n')).toEqual([]);
  });

  it('flags a list with no blank line above, with exact line/column', async () => {
    const problems = await h.lint('Some text\n* List item\n* List item\n\nMore\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
    expect(problems[0].column).toBe(1);
  });

  it('flags a list with no blank line below', async () => {
    const problems = await h.lint('Text\n\n1. List item\n2. List item\n***\n');
    expect(problems.length).toBeGreaterThanOrEqual(1);
    const below = problems.find((p) => p.line === 4);
    expect(below).toBeDefined();
  });

  it('does not flag a list at the very start or end of the document', async () => {
    expect(await h.lint('* List item\n* List item\n')).toEqual([]);
  });

  it('does not flag a lazy-continuation line as breaking the list', async () => {
    const md = '1. List item\n   More item 1\n2. List item\nMore item 2\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('only reports once for a nested list (top-level lists only, not nested sublists as separate entries)', async () => {
    const problems = await h.lint('Text\n* Item\n  * Nested\n\nMore\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
  });

  it('fixes a missing blank line above by inserting one', async () => {
    const fixed = await h.fix('Text\n* List item\n* List item\n\nMore\n');
    expect(fixed).toBe('Text\n\n* List item\n* List item\n\nMore\n');
  });

  it('fixes a missing blank line below by inserting one', async () => {
    // A plain line after the list would be a lazy continuation, so use a thematic break to
    // end the list.
    const fixed = await h.fix('Text\n\n* List item\n* List item\n***\n');
    expect(fixed).toBe('Text\n\n* List item\n* List item\n\n***\n');
  });

  it('inserts a blockquote-prefixed blank line above a list nested in a blockquote', async () => {
    const md = '> Some text\n> * List item\n> * List item\n>\n> More\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
    const fixed = await h.fix(md);
    expect(fixed).toBe('> Some text\n>\n> * List item\n> * List item\n>\n> More\n');
  });

  it('inserts a blockquote-prefixed blank line below a list nested in a blockquote', async () => {
    // Same here: use a thematic break to end the list.
    const md = '> Some text\n>\n> * List item\n> * List item\n> ***\n';
    const fixed = await h.fix(md);
    expect(fixed).toBe('> Some text\n>\n> * List item\n> * List item\n>\n> ***\n');
  });
});
