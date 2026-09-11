import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('commands-show-output (MD014)', () => {
  const h = tokenRuleHarness('commands-show-output');

  it('passes when commands show output', async () => {
    expect(await h.lint('```\n$ ls\nfoo bar\n$ cat foo\nHello world\n```\n')).toEqual([]);
  });

  it('passes when only some commands show output', async () => {
    expect(
      await h.lint("```\n$ mkdir test\nmkdir: created directory 'test'\n$ ls test\n```\n")
    ).toEqual([]);
  });

  it('flags every line when all commands are dollar-prefixed with no output, exact line/column', async () => {
    const problems = await h.lint('```\n$ ls\n$ cat foo\n$ less bar\n```\n');
    expect(problems).toHaveLength(3);
    expect(problems[0].line).toBe(2);
    expect(problems[0].column).toBe(1);
    expect(problems[1].line).toBe(3);
    expect(problems[2].line).toBe(4);
  });

  it('applies to indented code blocks too', async () => {
    const problems = await h.lint('    $ ls\n    $ cat foo\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(5);
  });

  it('produces the exact fixed output removing dollar prefixes', async () => {
    const fixed = await h.fix('```\n$ ls\n$ cat foo\n$ less bar\n```\n');
    expect(fixed).toBe('```\nls\ncat foo\nless bar\n```\n');
  });

  it('preserves leading indentation when fixing', async () => {
    const fixed = await h.fix('    $ ls\n    $ cat foo\n');
    expect(fixed).toBe('    ls\n    cat foo\n');
  });

  it('passes a document with no code blocks', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});
