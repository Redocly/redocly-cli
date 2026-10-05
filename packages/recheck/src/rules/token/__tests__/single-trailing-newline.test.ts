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
    expect(problems[0].column).toBe('No newline at EOF'.length);
  });

  it('does not flag extra trailing blank lines (only a missing final newline is reported)', async () => {
    expect(await h.lint('Text\n\n\n')).toEqual([]);
  });

  it('fixes a missing trailing newline by appending one', async () => {
    const fixed = await h.fix('# Heading\n\nNo newline at EOF');
    expect(fixed).toBe('# Heading\n\nNo newline at EOF\n');
  });
});
