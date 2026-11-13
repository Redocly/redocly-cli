import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-blanks-blockquote (MD028)', () => {
  const h = tokenRuleHarness('no-blanks-blockquote');

  it('passes two blockquotes separated by paragraph text', async () => {
    const md =
      '> This is a blockquote.\n\nThis is paragraph text.\n\n> This is a second blockquote.\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('passes two blockquotes separated by an HTML comment', async () => {
    const md = '> This is a blockquote.\n\n<!-- comment -->\n\n> This is a second blockquote.\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('passes a single blockquote with a blank continuation line (>  alone)', async () => {
    const md = '> This is a blockquote.\n>\n> This is the same blockquote.\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('flags a blank line between two blockquotes, on the blank line', async () => {
    const md = '> This is a blockquote\n> which is immediately followed by\n\n> this blockquote.\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
  });

  it('flags each blank line when multiple blank lines separate two blockquotes', async () => {
    const md = '> quote one\n\n\n> quote two\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(2);
    expect(problems.map((p) => p.line)).toEqual([2, 3]);
  });

  it('does not flag a blockquote at the end of the document followed only by a blank line', async () => {
    const md = '> quote\n\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('does not flag a blockquote followed by a blank line then non-blockquote content', async () => {
    const md = '> quote\n\nnot a quote\n';
    expect(await h.lint(md)).toEqual([]);
  });
});
