import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('table-column-count (MD056)', () => {
  const h = tokenRuleHarness('table-column-count');

  it('passes a table where every row has the same cell count', async () => {
    const md =
      '| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n| Cell   | Cell   |\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('flags a row with too few cells, with exact line/column', async () => {
    const md = '| Header | Header |\n| ------ | ------ |\n| Cell   |\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].message).toContain('Too few cells');
  });

  it('flags a row with too many cells, with exact line/column', async () => {
    const md = '| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   | Cell   |\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].message).toContain('Too many cells');
  });

  it('flags both a too-few and a too-many row in the same table (both directions)', async () => {
    const md =
      '| Header | Header |\n| ------ | ------ |\n| Cell   |\n| Cell   | Cell   | Cell   |\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatchObject({ line: 3 });
    expect(problems[0].message).toContain('Too few cells');
    expect(problems[1]).toMatchObject({ line: 4 });
    expect(problems[1].message).toContain('Too many cells');
  });

  it('resets the expected column count independently for a second table', async () => {
    const md =
      '| A | B | C |\n| - | - | - |\n| 1 | 2 | 3 |\n\nText\n\n| X | Y |\n| - | - |\n| 1 | 2 |\n';
    expect(await h.lint(md)).toEqual([]);
  });
});
