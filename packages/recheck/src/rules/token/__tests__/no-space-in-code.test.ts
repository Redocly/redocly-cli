import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-space-in-code (MD038)', () => {
  const h = tokenRuleHarness('no-space-in-code');

  it('passes a code span with no padding', async () => {
    expect(await h.lint('`some text`\n')).toEqual([]);
  });

  it('flags a code span with a single trailing space, exact line/column', async () => {
    const problems = await h.lint('`some text `\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    // startColumn of the trailing codeTextPadding token ` ` before the
    // closing backtick: "`some text `" -> padding starts at column 11.
    expect(problems[0].column).toBe(11);
  });

  it('flags a code span with a single leading space', async () => {
    const problems = await h.lint('` some text`\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].column).toBe(2);
  });

  it('flags a code span with excess leading and trailing spaces (3 each)', async () => {
    const problems = await h.lint('`   some text   `\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].line).toBe(1);
    expect(problems[1].line).toBe(1);
  });

  it('does not flag single-space padding needed to expose leading/trailing backticks', async () => {
    expect(await h.lint('`` `backticks` ``\n')).toEqual([]);
    expect(await h.lint('`` backtick` ``\n')).toEqual([]);
  });

  it('does not flag a code span containing only spaces', async () => {
    expect(await h.lint('` `\n')).toEqual([]);
    expect(await h.lint('`   `\n')).toEqual([]);
  });

  it('flags excess padding even when the content contains a backtick, once beyond the single allowed space', async () => {
    const problems = await h.lint('``  backtick`  ``\n');
    expect(problems).toHaveLength(2);
  });

  it('produces the exact fixed output trimming excess leading/trailing spaces', async () => {
    const fixed = await h.fix('`   some text   `\n');
    expect(fixed).toBe('`some text`\n');
  });

  it('produces the exact fixed output for a single excess trailing space', async () => {
    const fixed = await h.fix('`some text  `\n');
    expect(fixed).toBe('`some text`\n');
  });

  it('preserves the exempted single-space padding around a leading backtick when fixing', async () => {
    const fixed = await h.fix('`` `backticks` ``\n');
    expect(fixed).toBe('`` `backticks` ``\n');
  });

  it('passes a document with no code spans', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});
