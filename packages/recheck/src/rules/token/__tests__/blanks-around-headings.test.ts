import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('blanks-around-headings (MD022)', () => {
  const h = tokenRuleHarness('blanks-around-headings');

  it('passes a heading surrounded by blank lines', async () => {
    expect(await h.lint('Text\n\n# Heading\n\nMore text\n')).toEqual([]);
  });

  it('flags a heading missing a blank line above and below', async () => {
    const problems = await h.lint('# Heading 1\nSome text\n\nSome more text\n## Heading 2\n');
    expect(problems.length).toBeGreaterThanOrEqual(2);
    const aboveProblem = problems.find((p) => p.line === 5);
    expect(aboveProblem).toBeDefined();
    expect(aboveProblem?.message).toContain('Above');
  });

  it('ignores front matter directly before the first heading by default', async () => {
    expect(await h.lint('---\ntitle: T\n---\n## Heading\n\ntext\n')).toEqual([]);
  });

  it('requires a blank line after front matter when includeFrontMatter is true', async () => {
    const strict = tokenRuleHarness('blanks-around-headings', { includeFrontMatter: true });
    const problems = await strict.lint('---\ntitle: T\n---\n## Heading\n\ntext\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('Above');
  });

  it('honors linesAbove/linesBelow overrides', async () => {
    const relaxed = tokenRuleHarness('blanks-around-headings', {
      linesAbove: 0,
      linesBelow: 0,
    });
    expect(await relaxed.lint('Text\n# Heading\nMore text\n')).toEqual([]);
  });

  it('fixes a missing blank line above by inserting one', async () => {
    const fixed = await h.fix('Text\n# Heading\n\nMore\n');
    expect(fixed).toBe('Text\n\n# Heading\n\nMore\n');
  });

  it('fixes a missing blank line below by inserting one', async () => {
    const fixed = await h.fix('Text\n\n# Heading\nMore\n');
    expect(fixed).toBe('Text\n\n# Heading\n\nMore\n');
  });
});
