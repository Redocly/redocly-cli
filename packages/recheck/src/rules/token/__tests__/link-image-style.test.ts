import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('link-image-style (MD054)', () => {
  const h = tokenRuleHarness('link-image-style');

  it('passes everything by default (all styles allowed)', async () => {
    const md =
      '<https://example.com>\n\n[link](https://example.com)\n\n![image](https://example.com)\n\n[link][url]\n\n[url2][]\n\n[shortcut]\n\n[url]: https://example.com/full\n[url2]: https://example.com/collapsed\n[shortcut]: https://example.com/shortcut\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('honors autolink: false by flagging an autolink, exact line/column', async () => {
    const hNoAutolink = tokenRuleHarness('link-image-style', { autolink: false });
    const problems = await hNoAutolink.lint('<https://example.com>\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(1);
    expect(problems[0].match).toBe('<https://example.com>');
  });

  it('fixes a disallowed autolink to inline form, exact output', async () => {
    const hNoAutolink = tokenRuleHarness('link-image-style', { autolink: false });
    const fixed = await hNoAutolink.fix('<https://example.com>\n');
    expect(fixed).toBe('[https://example.com](https://example.com)\n');
  });

  it('honors inline: false by flagging an inline link', async () => {
    const hNoInline = tokenRuleHarness('link-image-style', { inline: false });
    const problems = await hNoInline.lint('[link](https://example.com/page)\n');
    expect(problems).toHaveLength(1);
  });

  it('fixes a disallowed inline link to autolink form when eligible, exact output', async () => {
    const hNoInline = tokenRuleHarness('link-image-style', { inline: false });
    const fixed = await hNoInline.fix('[https://example.com](https://example.com)\n');
    expect(fixed).toBe('<https://example.com>\n');
  });

  it('honors full: false by flagging a full reference link', async () => {
    const hNoFull = tokenRuleHarness('link-image-style', { full: false });
    const problems = await hNoFull.lint('[text][url]\n\n[url]: https://example.com\n');
    expect(problems).toHaveLength(1);
  });

  it('honors collapsed: false by flagging a collapsed reference link', async () => {
    const hNoCollapsed = tokenRuleHarness('link-image-style', { collapsed: false });
    const problems = await hNoCollapsed.lint('[url][]\n\n[url]: https://example.com\n');
    expect(problems).toHaveLength(1);
  });

  it('honors shortcut: false by flagging a shortcut reference link', async () => {
    const hNoShortcut = tokenRuleHarness('link-image-style', { shortcut: false });
    const problems = await hNoShortcut.lint('[shortcut]\n\n[shortcut]: https://example.com\n');
    expect(problems).toHaveLength(1);
  });

  it('honors urlInline: false by flagging an inline link whose text equals its autolink-able destination', async () => {
    const hNoUrlInline = tokenRuleHarness('link-image-style', { urlInline: false });
    const problems = await hNoUrlInline.lint('[https://example.com](https://example.com)\n');
    expect(problems).toHaveLength(1);
  });

  it('urlInline: false does not flag an inline link whose text differs from its destination', async () => {
    const hNoUrlInline = tokenRuleHarness('link-image-style', { urlInline: false });
    expect(await hNoUrlInline.lint('[my link](https://example.com)\n')).toEqual([]);
  });

  it('urlInline: false does not flag an image even when label equals destination (images are exempt)', async () => {
    const hNoUrlInline = tokenRuleHarness('link-image-style', { urlInline: false });
    expect(await hNoUrlInline.lint('![https://example.com](https://example.com)\n')).toEqual([]);
  });

  it('urlInline: false does not flag when autolink is also disabled (autolink && urlInline interaction)', async () => {
    const hBoth = tokenRuleHarness('link-image-style', { urlInline: false, autolink: false });
    expect(await hBoth.lint('[https://example.com](https://example.com)\n')).toEqual([]);
  });

  it('does not flag images for the autolink toggle (autolink only applies to non-image links)', async () => {
    const hNoAutolink = tokenRuleHarness('link-image-style', { autolink: false });
    expect(await hNoAutolink.lint('![alt](https://example.com)\n')).toEqual([]);
  });

  it('passes a document with no links or images', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});
