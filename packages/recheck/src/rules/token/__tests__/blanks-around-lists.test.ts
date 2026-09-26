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
    // A plain unindented line immediately after the last list item is a
    // lazy-continuation line (part of the list per CommonMark, per
    // doc/md032.md's own "not a violation" example) -- it does NOT trigger
    // this rule. Use a thematic break instead, which is never absorbed as
    // list content and so unambiguously ends the list right where it sits.
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
    // As with the top-level "below" case, an unindented follow-on line
    // would be absorbed as a lazy-continuation paragraph line even inside
    // a blockquote -- use a thematic break so the list unambiguously ends
    // where it sits.
    const md = '> Some text\n>\n> * List item\n> * List item\n> ***\n';
    const fixed = await h.fix(md);
    expect(fixed).toBe('> Some text\n>\n> * List item\n> * List item\n>\n> ***\n');
  });
});
