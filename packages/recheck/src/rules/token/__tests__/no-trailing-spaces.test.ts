// direct-invocation: name collides with legacy scope rule until Task 11
import { describe, expect, it } from 'vitest';

import { noTrailingSpaces } from '../no-trailing-spaces.js';
import { tokenRuleUnitHarness } from './harness.js';

describe('no-trailing-spaces (MD009)', () => {
  const h = tokenRuleUnitHarness(noTrailingSpaces);

  it('passes lines with no trailing whitespace', () => {
    expect(h.lint('Text text text\nMore text\n')).toEqual([]);
  });

  it('flags a line with trailing spaces, exact line/column', () => {
    const problems = h.lint('Text text text\ntrailing   \nMore text\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
    expect(problems[0].column).toBe(9); // "trailing" is 8 chars, +1
    expect(problems[0].message).toContain('Expected: 0 or 2; Actual: 3');
  });

  it('brSpaces: allows exactly 2 trailing spaces (hard break) by default', () => {
    expect(h.lint('Text text text\ntext  \nMore text\n')).toEqual([]);
  });

  it('brSpaces: honors a custom brSpaces value', () => {
    const hBr4 = tokenRuleUnitHarness(noTrailingSpaces, { brSpaces: 4 });
    expect(hBr4.lint('text\nline    \nmore\n')).toEqual([]);
    const problems = hBr4.lint('text\nline  \nmore\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
  });

  it('codeBlocks: false (default) exempts trailing spaces inside fenced code blocks', () => {
    const md = '```text\ncode line   \n```\n';
    expect(h.lint(md)).toEqual([]);
  });

  it('codeBlocks: true includes fenced code blocks', () => {
    const hCode = tokenRuleUnitHarness(noTrailingSpaces, { codeBlocks: true });
    const md = '```text\ncode line   \n```\n';
    const problems = hCode.lint(md);
    expect(problems.some((p) => p.line === 2)).toBe(true);
  });

  it('listItemEmptyLines: allows trailing-space-only blank lines inside list items', () => {
    const md = '- list item text\n   \n  list item text\n';
    const hList = tokenRuleUnitHarness(noTrailingSpaces, { listItemEmptyLines: true });
    expect(hList.lint(md)).toEqual([]);
    // Without the option, the blank indented line (3 trailing spaces, past
    // the default 2-space brSpaces allowance) is flagged.
    expect(h.lint(md).length).toBeGreaterThan(0);
  });

  it('strict: flags allowed brSpaces trailing spaces outside of paragraphs (e.g. after headings)', () => {
    const md = '# Heading  \n\nText\n';
    expect(h.lint(md)).toEqual([]); // not strict: 2 trailing spaces allowed everywhere
    const hStrict = tokenRuleUnitHarness(noTrailingSpaces, { strict: true });
    const problems = hStrict.lint(md);
    expect(problems.some((p) => p.line === 1)).toBe(true);
  });

  it('fixes trailing spaces by deleting them', () => {
    const fixed = h.fix('Text text text\ntrailing   \nMore text\n');
    expect(fixed).toBe('Text text text\ntrailing\nMore text\n');
  });
});
