import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-inline-html (MD033)', () => {
  const h = tokenRuleHarness('no-inline-html');
  const hAllowed = tokenRuleHarness('no-inline-html', { allowedElements: ['br'] });
  const hTableAllowed = tokenRuleHarness('no-inline-html', { tableAllowedElements: ['br'] });

  it('passes pure Markdown with no inline HTML', async () => {
    expect(await h.lint('# Heading\n\nSome *text*.\n')).toEqual([]);
  });

  it('flags an inline HTML element, exact line/column', async () => {
    const problems = await h.lint('Some <span>text</span> here.\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(6);
    expect(problems[0].message).toContain('Element: span');
  });

  it('does not flag a closing tag (only unclosed opening tags are reported)', async () => {
    // Only the opening <span> is flagged, not </span>
    const problems = await h.lint('Some <span>text</span> here.\n');
    expect(problems).toHaveLength(1);
  });

  it('honors allowedElements: does not flag an allowed element anywhere', async () => {
    expect(await hAllowed.lint('Line one<br>\nLine two\n')).toEqual([]);
  });

  it('honors allowedElements: still flags a non-allowed element', async () => {
    const problems = await hAllowed.lint('Some <span>text</span> here.\n');
    expect(problems).toHaveLength(1);
  });

  it('honors tableAllowedElements: allows an element only inside a table', async () => {
    const md = '| a | b |\n| - | - |\n| <br> | x |\n';
    expect(await hTableAllowed.lint(md)).toEqual([]);
  });

  it('honors tableAllowedElements: still flags the same element outside a table', async () => {
    const problems = await hTableAllowed.lint('Some <br> text.\n');
    expect(problems).toHaveLength(1);
  });

  it('passes a document with no HTML at all', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });

  it('flags block-level HTML tags like <details>/<summary> (regression, parity with upstream MD033)', async () => {
    // Regression: `<details>`/`<summary>` (and any other block-level HTML
    // -- <div>, <details>, etc.) parse as `htmlFlow`, not `htmlText`,
    // because they start at the beginning of a line. Before the parser
    // was fixed to reparse htmlFlow blocks as inline content (see
    // parser/__tests__/parser.test.ts's "htmlFlow reparse" suite), this
    // rule -- which only ever filtered for `htmlText` -- was completely
    // blind to block-level HTML, silently missing a very common
    // real-world pattern (found via the Task 12 differential parity
    // harness against markdownlint on the monorepo docs corpus).
    const md = '<details>\n<summary>Click to expand</summary>\n\nBody.\n</details>\n';
    const problems = await h.lint(md);
    const elements = problems.map((p) => p.message.match(/Element: (\w+)/)?.[1]);
    expect(elements).toEqual(expect.arrayContaining(['details', 'summary']));
    // Closing tags are never flagged (only unclosed opening tags are).
    expect(problems.every((p) => !p.message.includes('Element: /'))).toBe(true);
  });
});
