import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-alt-text (MD045)', () => {
  const h = tokenRuleHarness('no-alt-text');

  it('passes a Markdown image with alt text', async () => {
    expect(await h.lint('![Alternate text](image.jpg)\n')).toEqual([]);
  });

  it('flags a Markdown image with empty alt text, exact line/column', async () => {
    const problems = await h.lint('![](image.jpg)\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(1);
    expect(problems[0].match).toBe('![](image.jpg)');
  });

  it('passes an HTML image with an alt attribute', async () => {
    // A standalone `<img>` at the start of a line is block-level HTML
    // (`htmlFlow`, not `htmlText`) per CommonMark. Since Task 12, htmlFlow
    // content is subtokenized, so block-level `<img>` can be processed by
    // our rule (via includeHtmlFlow: true). This example embeds it inline
    // (matching how the rule's own doc examples describe HTML images).
    expect(await h.lint('Photo: <img src="image.jpg" alt="Alternate text" />\n')).toEqual([]);
  });

  it('flags an HTML image with no alt attribute', async () => {
    const problems = await h.lint('Photo: <img src="image.jpg" />\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });

  it('does not flag an HTML image with aria-hidden="true"', async () => {
    expect(await h.lint('Photo: <img src="image.jpg" aria-hidden="true" />\n')).toEqual([]);
  });

  it('flags an HTML image with aria-hidden="false" and no alt', async () => {
    const problems = await h.lint('Photo: <img src="image.jpg" aria-hidden="false" />\n');
    expect(problems).toHaveLength(1);
  });

  it('passes a reference-style image with alt text', async () => {
    expect(await h.lint('![Alternate text][ref]\n\n[ref]: image.jpg "Optional title"\n')).toEqual(
      []
    );
  });

  it('passes a document with no images', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });

  it('flags block-level HTML img without alt (regression: includeHtmlFlow)', async () => {
    // A standalone `<img>` at the start of a line (own paragraph) is
    // block-level HTML (htmlFlow, not htmlText). Since Task 12, htmlFlow
    // content is subtokenized, making block-level `<img>` reachable to the
    // rule's "Process HTML images" branch (which uses includeHtmlFlow: true).
    // This test pins that the rule correctly flags missing alt on such images.
    const problems = await h.lint('<img src="x.png" />\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });
});
