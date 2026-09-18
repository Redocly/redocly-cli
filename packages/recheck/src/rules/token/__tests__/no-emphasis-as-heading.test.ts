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
    // '!' is not in the custom punctuation set, so this should now flag.
    const problems = await custom.lint('**Bold sentence!**\n');
    expect(problems).toHaveLength(1);
  });

  it('flags emphasis-only paragraph marked inHtmlFlow when on the same line (regression: includeHtmlFlow)', async () => {
    // Upstream md036 uses filterByTypesCached(..., true) to include paragraphs
    // marked as inside htmlFlow. Task 12 htmlFlow reparse marks such paragraphs
    // with inHtmlFlow flag; without includeHtmlFlow: true in the filterByTypes
    // call, they are excluded. The fix adds the flag so these paragraphs are
    // reconsidered. A paragraph like `<div>**Just bold**</div>` is tokenized as
    // a single paragraph with children: htmlText, strong, htmlText. After
    // filtering out meaningless children (htmlText, empty data), one child
    // remains: the strong token. This matches the emphasis-only pattern, so
    // the rule flags it. Verified against markdownlint@0.41.0 (oracle): flags
    // line 1 with context "Just bold".
    const problems = await h.lint('<div>**Just bold**</div>\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });

  it('does not flag emphasis-only paragraph marked inHtmlFlow when split across lines', async () => {
    // Upstream's isParagraphChildMeaningful does NOT filter out lineEnding
    // tokens (only htmlText and empty data). So when the html tags and the
    // emphasis are on separate lines, the paragraph's meaningful-children
    // count includes the lineEnding tokens surrounding the strong token,
    // making the meaningful-child count > 1, so the paragraph is not
    // considered emphasis-only. Verified against markdownlint@0.41.0
    // (oracle): produces zero problems for this input.
    const problems = await h.lint('<div>\n**Just bold**\n</div>\n');
    expect(problems).toEqual([]);
  });

  it('still flags emphasis-only top-level paragraphs normally', async () => {
    // Verify includeHtmlFlow doesn't break normal (non-htmlFlow) paragraphs.
    const problems = await h.lint('**Just bold**\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });
});
