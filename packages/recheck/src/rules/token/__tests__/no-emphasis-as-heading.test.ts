import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-emphasis-as-heading (MD036)', () => {
  const h = tokenRuleHarness('no-emphasis-as-heading');

  it('passes a real heading', async () => {
    expect(await h.lint('# My document\n\nLorem ipsum dolor sit amet.\n')).toEqual([]);
  });

  it('flags a bold-only paragraph used as a heading', async () => {
    const problems = await h.lint('**My document**\n\nLorem ipsum dolor sit amet.\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });

  it('flags an italic-only paragraph used as a heading', async () => {
    const problems = await h.lint('_Another section_\n\nConsectetur adipiscing.\n');
    expect(problems).toHaveLength(1);
  });

  it('does not flag emphasis within regular sentence text', async () => {
    expect(await h.lint('This has **some bold** text in it.\n')).toEqual([]);
  });

  it('does not flag a paragraph ending in punctuation', async () => {
    expect(await h.lint('**Bold sentence.**\n')).toEqual([]);
  });

  it('honors a custom punctuation option', async () => {
    const custom = tokenRuleHarness('no-emphasis-as-heading', { punctuation: '.,;:' });
    const problems = await custom.lint('**Bold sentence!**\n');
    expect(problems).toHaveLength(1);
  });

  it('flags emphasis-only paragraph marked inHtmlFlow when on the same line (regression: includeHtmlFlow)', async () => {
    // The htmlText tags are ignored, so only the strong child is left and the paragraph
    // counts as emphasis-only.
    const problems = await h.lint('<div>**Just bold**</div>\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });

  it('does not flag emphasis-only paragraph marked inHtmlFlow when split across lines', async () => {
    // The line endings between the tags count as extra children, so this is not emphasis-only.
    const problems = await h.lint('<div>\n**Just bold**\n</div>\n');
    expect(problems).toEqual([]);
  });

  it('still flags emphasis-only top-level paragraphs normally', async () => {
    const problems = await h.lint('**Just bold**\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });
});
