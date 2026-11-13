import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('heading-start-left (MD023)', () => {
  const h = tokenRuleHarness('heading-start-left');

  it('passes a heading starting at column 1', async () => {
    expect(await h.lint('# Heading\n')).toEqual([]);
  });

  it('flags an indented heading with position', async () => {
    const problems = await h.lint('Some text\n\n  # Indented heading\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].column).toBe(1);
  });

  it('does not flag a heading indented only by a blockquote marker', async () => {
    expect(await h.lint('> # Heading in Block Quote\n')).toEqual([]);
  });

  it('fixes by removing the leading indentation', async () => {
    expect(await h.fix('Some text\n\n  # Indented heading\n')).toBe(
      'Some text\n\n# Indented heading\n'
    );
  });
});
