import { describe, it, expect } from 'vitest';

import { tokenRuleHarness } from './harness.js';

const h = tokenRuleHarness('no-empty-headings');

describe('no-empty-headings', () => {
  it('flags an ATX heading with no text', async () => {
    const problems = await h.lint('# \n\ntext\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toBe('Headings should have text content');
  });

  it('flags a bare hash with no trailing space', async () => {
    expect(await h.lint('#\n')).toHaveLength(1);
  });

  // `****` is literal text, not empty emphasis, so it is not reported. HTML-only content
  // renders to nothing.
  it('flags a heading whose only content is HTML', async () => {
    expect(await h.lint('## <span></span>\n')).toHaveLength(1);
  });

  it('does not flag a heading of literal asterisks', async () => {
    expect(await h.lint('## ****\n')).toEqual([]);
  });

  it('does not flag a heading with text', async () => {
    expect(await h.lint('# Title\n')).toEqual([]);
  });

  it('does not flag a heading whose text is only inline code', async () => {
    expect(await h.lint('# `config.yaml`\n')).toEqual([]);
  });

  // A blank line before `===` makes no heading, so use HTML-only content for an empty setext
  // heading.
  it('flags an empty setext heading at its own line', async () => {
    const problems = await h.lint('Intro paragraph.\n\n<span></span>\n===\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
  });

  it('reports nothing for a whitespace-only line before === (not a heading)', async () => {
    expect(await h.lint('  \n===\n')).toEqual([]);
  });

  it('does not flag a setext heading with text', async () => {
    expect(await h.lint('Setext\n===\n')).toEqual([]);
  });
});
