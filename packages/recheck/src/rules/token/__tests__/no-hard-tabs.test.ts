import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-hard-tabs (MD010)', () => {
  const h = tokenRuleHarness('no-hard-tabs');

  it('passes lines with no hard tabs', async () => {
    expect(await h.lint('Some text\n\n    * spaces used to indent\n')).toEqual([]);
  });

  it('flags a hard tab, exact line/column', async () => {
    const problems = await h.lint('Some text\n\n\t* hard tab character used to indent\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].column).toBe(1);
    expect(problems[0].message).toContain('Column: 1');
  });

  it('codeBlocks: true (default) flags hard tabs inside fenced code blocks', async () => {
    const md = '```text\n\tcode with a tab\n```\n';
    const problems = await h.lint(md);
    expect(problems.some((p) => p.line === 2)).toBe(true);
  });

  it('codeBlocks: false excludes fenced/indented code blocks and code spans', async () => {
    const hNoCode = tokenRuleHarness('no-hard-tabs', { codeBlocks: false });
    const md = '```text\n\tfenced\n```\n\n\tindented\n\nA `code\tspan` here.\n';
    expect(await hNoCode.lint(md)).toEqual([]);
    expect((await h.lint(md)).map((p) => p.line)).toEqual([2, 5, 7]);
  });

  it('ignoreCodeLanguages: excludes fenced code blocks whose language matches (case-insensitive)', async () => {
    const hIgnore = tokenRuleHarness('no-hard-tabs', {
      ignoreCodeLanguages: ['Text'],
    });
    const md = '```text\n\tcode with a tab\n```\n';
    expect(await hIgnore.lint(md)).toEqual([]);
    // A different language is still flagged.
    const md2 = '```js\n\tcode with a tab\n```\n';
    expect((await hIgnore.lint(md2)).some((p) => p.line === 2)).toBe(true);
  });

  it('spacesPerTab: fix inserts spacesPerTab spaces per tab (default 1)', async () => {
    const fixed = await h.fix('Some text\n\ttabbed\n');
    expect(fixed).toBe('Some text\n tabbed\n');
  });

  it('spacesPerTab: honors a custom value', async () => {
    const hSpaces4 = tokenRuleHarness('no-hard-tabs', { spacesPerTab: 4 });
    const fixed = await hSpaces4.fix('Some text\n\ttabbed\n');
    expect(fixed).toBe('Some text\n    tabbed\n');
  });

  it('flags two separate tab runs on the same line as two errors with distinct fixInfo, and merges correctly via applyFixesToContent', async () => {
    const problems = await h.lint('a\tb\tc\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].column).toBe(2);
    expect(problems[1].column).toBe(4);
    const fixed = await h.fix('a\tb\tc\n');
    expect(fixed).toBe('a b c\n');
  });
});
