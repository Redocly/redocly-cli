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

  // Deviation from the plan's guessed example (`## ****`): micromark parses
  // `****` as literal text, not empty emphasis, so that heading genuinely
  // HAS text content and is correctly not reported. An HTML-only heading is
  // the real "renders to nothing" case, since getHeadingText drops htmlText.
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

  // Setext coverage needs a heading that IS a setextHeading token and IS
  // empty. A whitespace-only line before `===` yields NO heading token at
  // all (a blank line forms no paragraph for the underline to promote), so
  // the reachable case is HTML-only content, which getHeadingText drops.
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
