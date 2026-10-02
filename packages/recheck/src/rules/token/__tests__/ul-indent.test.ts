import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('ul-indent (MD007)', () => {
  const h = tokenRuleHarness('ul-indent');

  it('passes a nested list indented by 2 spaces (default)', async () => {
    expect(await h.lint('* List item\n  * Nested list item indented by 2 spaces\n')).toEqual([]);
  });

  it('flags a nested item indented by the wrong amount, with exact line/column', async () => {
    const problems = await h.lint('* List item\n   * Nested list item indented by 3 spaces\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
    expect(problems[0].message).toContain('Expected: 2; Actual: 3');
  });

  it('fixes a misindented nested item to the expected indent', async () => {
    const fixed = await h.fix('* List item\n   * Nested by 3\n');
    expect(fixed).toBe('* List item\n  * Nested by 3\n');
  });

  it('does not apply to a sublist nested under an ordered list', async () => {
    expect(await h.lint('1. Item\n   * Nested under ordered\n')).toEqual([]);
  });

  it('option indent: honors a custom indent width', async () => {
    const four = tokenRuleHarness('ul-indent', { indent: 4 });
    expect(await four.lint('* List item\n    * Nested by 4\n')).toEqual([]);
    const problems = await four.lint('* List item\n  * Nested by 2\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('Expected: 4; Actual: 2');
  });

  it('option startIndented: indents the first level by `indent` spaces', async () => {
    const startIndented = tokenRuleHarness('ul-indent', { startIndented: true });
    expect(await startIndented.lint('  * Top level, indented\n    * Nested\n')).toEqual([]);
    const problems = await startIndented.lint('* Top level, not indented\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('Expected: 2; Actual: 0');
  });

  it('option startIndent: uses a different first-level indent than nested levels (only with startIndented)', async () => {
    const custom = tokenRuleHarness('ul-indent', {
      startIndented: true,
      startIndent: 4,
      indent: 2,
    });
    expect(await custom.lint('    * Top level, indented by 4\n      * Nested by 2 more\n')).toEqual(
      []
    );
  });

  it('adjusts expected indent for a list nested inside a blockquote', async () => {
    expect(await h.lint('> * Item 1\n>   * Nested Item 1\n')).toEqual([]);
    const problems = await h.lint('> * Item 1\n>    * Nested by 3\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('Expected: 2; Actual: 3');
  });
});
