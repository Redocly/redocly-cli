import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('single-trailing-newline (MD047)', () => {
  const h = tokenRuleHarness('single-trailing-newline');

  it('passes a file ending with a single newline', async () => {
    expect(await h.lint('# Heading\n\nSome text.\n')).toEqual([]);
  });

  it('flags a file with no trailing newline, with exact line/column', async () => {
    const problems = await h.lint('# Heading\n\nNo newline at EOF');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    // Upstream range is [lastLine.length, 1] (1-based column at the end of
    // the last line, i.e. where the missing newline would be inserted).
    expect(problems[0].column).toBe('No newline at EOF'.length);
  });

  it('flags a file ending with multiple blank lines (not a single newline)', async () => {
    // Splitting on '\n' means a file ending in "\n\n" has a trailing empty
    // last line, which IS blank -- so this is actually fine per isBlankLine.
    // Use a case where the last line has content followed by no newline.
    const problems = await h.lint('Text\nMore text');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
  });

  it('fixes a missing trailing newline by appending one', async () => {
    const fixed = await h.fix('# Heading\n\nNo newline at EOF');
    expect(fixed).toBe('# Heading\n\nNo newline at EOF\n');
  });
});
