import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-trailing-spaces (MD009)', () => {
  const h = tokenRuleHarness('no-trailing-spaces');

  it('passes lines with no trailing whitespace', async () => {
    expect(await h.lint('Text text text\nMore text\n')).toEqual([]);
  });

  it('flags a line with trailing spaces, exact line/column', async () => {
    const problems = await h.lint('Text text text\ntrailing   \nMore text\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
    expect(problems[0].column).toBe(9); // "trailing" is 8 chars, +1
    expect(problems[0].message).toContain('Expected: 0 or 2; Actual: 3');
  });

  it('brSpaces: allows exactly 2 trailing spaces (hard break) by default', async () => {
    expect(await h.lint('Text text text\ntext  \nMore text\n')).toEqual([]);
  });

  it('brSpaces: honors a custom brSpaces value', async () => {
    const hBr4 = tokenRuleHarness('no-trailing-spaces', { brSpaces: 4 });
    expect(await hBr4.lint('text\nline    \nmore\n')).toEqual([]);
    const problems = await hBr4.lint('text\nline  \nmore\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
  });

  it('codeBlocks: false (default) exempts trailing spaces inside fenced code blocks', async () => {
    const md = '```text\ncode line   \n```\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('codeBlocks: true includes fenced code blocks', async () => {
    const hCode = tokenRuleHarness('no-trailing-spaces', { codeBlocks: true });
    const md = '```text\ncode line   \n```\n';
    const problems = await hCode.lint(md);
    expect(problems.some((p) => p.line === 2)).toBe(true);
  });

  it('listItemEmptyLines: allows trailing-space-only blank lines inside list items', async () => {
    const md = '- list item text\n   \n  list item text\n';
    const hList = tokenRuleHarness('no-trailing-spaces', {
      listItemEmptyLines: true,
    });
    expect(await hList.lint(md)).toEqual([]);
    // Without the option, the blank indented line (3 trailing spaces, past
    // the default 2-space brSpaces allowance) is flagged.
    expect(await h.lint(md)).not.toEqual([]);
  });

  it('strict: flags allowed brSpaces trailing spaces outside of paragraphs (e.g. after headings)', async () => {
    const md = '# Heading  \n\nText\n';
    expect(await h.lint(md)).toEqual([]); // not strict: 2 trailing spaces allowed everywhere
    const hStrict = tokenRuleHarness('no-trailing-spaces', { strict: true });
    const problems = await hStrict.lint(md);
    expect(problems.some((p) => p.line === 1)).toBe(true);
  });

  it('fixes trailing spaces by deleting them', async () => {
    const fixed = await h.fix('Text text text\ntrailing   \nMore text\n');
    expect(fixed).toBe('Text text text\ntrailing\nMore text\n');
  });
});
