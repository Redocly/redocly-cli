import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-multiple-space-blockquote (MD027)', () => {
  const h = tokenRuleHarness('no-multiple-space-blockquote');

  it('passes a blockquote with a single space after the marker', async () => {
    expect(await h.lint('> This is a blockquote with correct\n> indentation.\n')).toEqual([]);
  });

  it('flags multiple spaces after the blockquote symbol, with exact line/column', async () => {
    const problems = await h.lint(
      '>  This is a blockquote with bad indentation\n>  there should only be one.\n'
    );
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatchObject({ line: 1, column: 3 });
    expect(problems[1]).toMatchObject({ line: 2, column: 3 });
  });

  it('does not flag a blockquote nested list item when listItems is false', async () => {
    const h2 = tokenRuleHarness('no-multiple-space-blockquote', { listItems: false });
    expect(await h2.lint('>  -  item\n')).toEqual([]);
  });

  it('flags a blockquote nested list item by default (listItems true)', async () => {
    const problems = await h.lint('>  -  item\n');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ line: 1, column: 3 });
  });

  it('does not flag indented code inside a blockquote', async () => {
    expect(await h.lint('>     indented code\n')).toEqual([]);
  });

  it('fixes multiple spaces after the blockquote symbol', async () => {
    const fixed = await h.fix('>  This is a blockquote with bad indentation\n');
    expect(fixed).toBe('> This is a blockquote with bad indentation\n');
  });
});
