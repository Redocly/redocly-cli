import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('link-image-reference-definitions (MD053)', () => {
  const h = tokenRuleHarness('link-image-reference-definitions');

  it('passes a definition that is referenced by a link', async () => {
    expect(await h.lint('[text][label]\n\n[label]: https://example.com/label\n')).toEqual([]);
  });

  it('flags an unused definition, exact line/column', async () => {
    const problems = await h.lint('[unused]: https://example.com/unused\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(1);
    expect(problems[0].message).toContain('Unused link or image reference definition: "unused"');
  });

  it('fixes an unused single-line definition by deleting the line, exact output', async () => {
    const fixed = await h.fix('Text.\n\n[unused]: https://example.com/unused\n');
    expect(fixed).toBe('Text.\n\n');
  });

  it('flags a duplicate definition, exact line/column', async () => {
    const problems = await h.lint('[label]: /url\n[label]: /url2\n\n[x][label]\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(2);
    expect(problems[0].message).toContain('Duplicate link or image reference definition: "label"');
  });

  it('honors the default ignoredDefinitions ("//" comment convention)', async () => {
    expect(await h.lint('[//]: # (This behaves like a comment)\n')).toEqual([]);
  });

  it('honors a custom ignoredDefinitions list', async () => {
    const hIgnored = tokenRuleHarness('link-image-reference-definitions', {
      ignoredDefinitions: ['deliberately-unused'],
    });
    expect(await hIgnored.lint('[deliberately-unused]: https://example.com/unused\n')).toEqual([]);
  });

  it('does not flag a definition referenced via shortcut syntax', async () => {
    expect(await h.lint('[label]\n\n[label]: https://example.com/label\n')).toEqual([]);
  });

  it('does not flag a definition referenced via collapsed syntax', async () => {
    expect(await h.lint('[label][]\n\n[label]: https://example.com/label\n')).toEqual([]);
  });

  it('passes a document with no definitions', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});
