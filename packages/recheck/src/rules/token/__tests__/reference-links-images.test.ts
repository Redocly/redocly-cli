import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('reference-links-images (MD052)', () => {
  const h = tokenRuleHarness('reference-links-images');

  it('passes a full reference link whose label is defined', async () => {
    expect(await h.lint('[text][label]\n\n[label]: https://example.com/label\n')).toEqual([]);
  });

  it('flags a full reference link whose label is undefined, exact line/column', async () => {
    const problems = await h.lint('[text][undefined-label]\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain(
      'Missing link or image reference definition: "undefined-label"'
    );
  });

  it('flags a collapsed reference link whose label is undefined', async () => {
    const problems = await h.lint('[undefined-label][]\n');
    expect(problems).toHaveLength(1);
  });

  it('does not flag shortcut syntax by default (shortcutSyntax: false)', async () => {
    expect(await h.lint('[undefined-shortcut]\n')).toEqual([]);
  });

  it('honors shortcutSyntax: true by flagging an undefined shortcut', async () => {
    const hShortcut = tokenRuleHarness('reference-links-images', { shortcutSyntax: true });
    const problems = await hShortcut.lint('[undefined-shortcut]\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('"undefined-shortcut"');
  });

  it('ignores the default "x" label (task-list checkbox syntax) even with shortcutSyntax: true', async () => {
    const hShortcut = tokenRuleHarness('reference-links-images', { shortcutSyntax: true });
    expect(await hShortcut.lint('- [x] Checked task list item\n')).toEqual([]);
  });

  it('honors a custom ignoredLabels list', async () => {
    const hIgnored = tokenRuleHarness('reference-links-images', {
      ignoredLabels: ['deliberately-unused'],
    });
    expect(await hIgnored.lint('[text][deliberately-unused]\n')).toEqual([]);
  });

  it('passes an image using full reference syntax with a defined label', async () => {
    expect(await h.lint('![alt][image]\n\n[image]: https://example.com/image.png\n')).toEqual([]);
  });

  it('passes a document with no reference links', async () => {
    expect(await h.lint('Just a paragraph with [an inline link](https://example.com).\n')).toEqual(
      []
    );
  });

  it('does not flag a task-list checkbox as an undefined shortcut label (label trims to empty)', async () => {
    const hShortcut = tokenRuleHarness('reference-links-images', { shortcutSyntax: true });
    expect(await hShortcut.lint('- [ ] todo\n')).toEqual([]);
  });

  it('flags an undefined shortcut that sits alongside a real link in the same paragraph', async () => {
    const hShortcut = tokenRuleHarness('reference-links-images', { shortcutSyntax: true });
    const problems = await hShortcut.lint('[undef] and [real](https://example.com)\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain('undef');
  });
});
