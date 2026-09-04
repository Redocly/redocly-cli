import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('table-pipe-style (MD055)', () => {
  const h = tokenRuleHarness('table-pipe-style');

  it('passes a table consistently using leading and trailing pipes', async () => {
    const md = '| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('passes a table consistently using no leading or trailing pipes', async () => {
    const md = 'Header | Header\n------ | ------\nCell   | Cell\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('flags a table inconsistent about leading/trailing pipes, with exact line/column', async () => {
    const md = '| Header | Header |\n| ------ | ------\n  Cell   | Cell   |\n';
    const problems = await h.lint(md);
    // Delimiter row is missing its trailing pipe; body row is missing its leading pipe.
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatchObject({ line: 2, column: 17 });
    expect(problems[0].message).toContain('Missing trailing pipe');
    expect(problems[1]).toMatchObject({ line: 3, column: 3 });
    expect(problems[1].message).toContain('Missing leading pipe');
  });

  it('honors the leading_only style option', async () => {
    const h2 = tokenRuleHarness('table-pipe-style', { style: 'leading_only' });
    const md = '| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n';
    const problems = await h2.lint(md);
    // Every row has a trailing pipe, which is unexpected under leading_only.
    expect(problems.length).toBeGreaterThan(0);
    expect(
      problems.every((p) => p.message.includes('Unexpected') && p.message.includes('trailing'))
    ).toBe(true);
  });

  it('honors the no_leading_or_trailing style option', async () => {
    const h2 = tokenRuleHarness('table-pipe-style', { style: 'no_leading_or_trailing' });
    const md = 'Header | Header\n------ | ------\nCell   | Cell\n';
    expect(await h2.lint(md)).toEqual([]);
  });

  it('honors the trailing_only style option, flagging a leading pipe as unexpected', async () => {
    const h2 = tokenRuleHarness('table-pipe-style', { style: 'trailing_only' });
    const md = '| Header | Header|\n| ------ | ------|\n| Cell   | Cell  |\n';
    const problems = await h2.lint(md);
    expect(problems.length).toBeGreaterThan(0);
    expect(
      problems.every((p) => p.message.includes('Unexpected') && p.message.includes('leading'))
    ).toBe(true);
  });
});
