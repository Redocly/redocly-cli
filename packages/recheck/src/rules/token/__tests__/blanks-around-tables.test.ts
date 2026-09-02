import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('blanks-around-tables (MD058)', () => {
  const h = tokenRuleHarness('blanks-around-tables');

  it('passes a table surrounded by blank lines', async () => {
    const md =
      'Some text\n\n| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n\n> Blockquote\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('flags a table with no blank line above, with exact line/column', async () => {
    const md = 'Some text\n| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
  });

  it('flags a table with no blank line below', async () => {
    const md = '| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n> Blockquote\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
  });

  it('does not flag a table at the very start or end of the document', async () => {
    expect(await h.lint('| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n')).toEqual(
      []
    );
  });

  it('does not flag text immediately following a table (absorbed as part of the table)', async () => {
    const md =
      '| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\nThis text is part of the table and the next line is blank\n\nSome text\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('fixes a missing blank line above by inserting one', async () => {
    const md = 'Some text\n| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n';
    const fixed = await h.fix(md);
    expect(fixed).toBe(
      'Some text\n\n| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n'
    );
  });

  it('fixes a missing blank line below by inserting one', async () => {
    const md = '| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n> Blockquote\n';
    const fixed = await h.fix(md);
    expect(fixed).toBe(
      '| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n\n> Blockquote\n'
    );
  });

  it('inserts a blockquote-prefixed blank line above a table nested in a blockquote', async () => {
    const md = '> Some text\n> | Header | Header |\n> | ------ | ------ |\n> | Cell   | Cell   |\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
    const fixed = await h.fix(md);
    expect(fixed).toBe(
      '> Some text\n>\n> | Header | Header |\n> | ------ | ------ |\n> | Cell   | Cell   |\n'
    );
  });
});
