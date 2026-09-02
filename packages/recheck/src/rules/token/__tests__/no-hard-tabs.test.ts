// direct-invocation: name collides with legacy scope rule until Task 11
import { describe, expect, it } from 'vitest';

import { noHardTabs } from '../no-hard-tabs.js';
import { tokenRuleUnitHarness } from './harness.js';

describe('no-hard-tabs (MD010)', () => {
  const h = tokenRuleUnitHarness(noHardTabs);

  it('passes lines with no hard tabs', () => {
    expect(h.lint('Some text\n\n    * spaces used to indent\n')).toEqual([]);
  });

  it('flags a hard tab, exact line/column', () => {
    const problems = h.lint('Some text\n\n\t* hard tab character used to indent\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].column).toBe(1);
    expect(problems[0].message).toContain('Column: 1');
  });

  it('codeBlocks: true (default) flags hard tabs inside fenced code blocks', () => {
    const md = '```text\n\tcode with a tab\n```\n';
    const problems = h.lint(md);
    expect(problems.some((p) => p.line === 2)).toBe(true);
  });

  it('codeBlocks: false excludes fenced/indented code blocks and code spans', () => {
    const hNoCode = tokenRuleUnitHarness(noHardTabs, { codeBlocks: false });
    const md = '```text\n\tcode with a tab\n```\n';
    expect(hNoCode.lint(md)).toEqual([]);
  });

  it('ignoreCodeLanguages: excludes fenced code blocks whose language matches (case-insensitive)', () => {
    const hIgnore = tokenRuleUnitHarness(noHardTabs, { ignoreCodeLanguages: ['Text'] });
    const md = '```text\n\tcode with a tab\n```\n';
    expect(hIgnore.lint(md)).toEqual([]);
    // A different language is still flagged.
    const md2 = '```js\n\tcode with a tab\n```\n';
    expect(hIgnore.lint(md2).some((p) => p.line === 2)).toBe(true);
  });

  it('spacesPerTab: fix inserts spacesPerTab spaces per tab (default 1)', () => {
    const fixed = h.fix('Some text\n\ttabbed\n');
    expect(fixed).toBe('Some text\n tabbed\n');
  });

  it('spacesPerTab: honors a custom value', () => {
    const hSpaces4 = tokenRuleUnitHarness(noHardTabs, { spacesPerTab: 4 });
    const fixed = hSpaces4.fix('Some text\n\ttabbed\n');
    expect(fixed).toBe('Some text\n    tabbed\n');
  });

  it('flags two separate tab runs on the same line as two errors with distinct fixInfo, and merges correctly via applyFixesToContent', () => {
    const problems = h.lint('a\tb\tc\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].column).toBe(2);
    expect(problems[1].column).toBe(4);
    const fixed = h.fix('a\tb\tc\n');
    expect(fixed).toBe('a b c\n');
  });
});
