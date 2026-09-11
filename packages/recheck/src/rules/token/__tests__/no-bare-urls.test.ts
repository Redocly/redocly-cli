import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-bare-urls (MD034)', () => {
  const h = tokenRuleHarness('no-bare-urls');

  it('passes a URL already wrapped in angle brackets', async () => {
    expect(await h.lint('Visit <https://example.com/> now.\n')).toEqual([]);
  });

  it('flags a bare URL, exact line/column', async () => {
    const problems = await h.lint('Visit https://example.com/ now.\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(7);
    expect(problems[0].match).toBe('https://example.com/');
  });

  it('fixes a bare URL by wrapping it in angle brackets, exact output', async () => {
    const fixed = await h.fix('Visit https://example.com/ now.\n');
    expect(fixed).toBe('Visit <https://example.com/> now.\n');
  });

  it('does not flag a bare email/URL inside a code span', async () => {
    expect(await h.lint('Not a clickable link: `https://www.example.com`\n')).toEqual([]);
  });

  it('does not flag a bare URL inside the content of an inline HTML tag', async () => {
    expect(await h.lint('<a href="mailto:test@example.com">test@example.com</a>\n')).toEqual([]);
  });

  it('flags a bare email address', async () => {
    const problems = await h.lint('Contact user@example.com for help.\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].match).toBe('user@example.com');
  });

  it('passes a document with no bare URLs', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });

  it('does not flag a bare URL inside an HTML attribute value in a BLOCK-level HTML element (regression)', async () => {
    // Regression: found via the Task 12 differential parity harness on
    // mdn-content. A block-level `<a href="...">` starting at column 1
    // (`htmlFlow`, not `htmlText`) reparses its attribute text as inline
    // content (see parser/index.ts's `reparseHtmlFlow`), which can surface
    // the URL as a `literalAutolink` token -- but it's an HTML attribute
    // value, not markdown prose, so it must stay excluded the same way a
    // genuinely inline `<a href="...">` already was. Matches upstream's
    // own `!inHtmlFlow(token)` check in md034.mjs.
    const md = '<a href="https://example.com/">Link text</a>\n\nBody.\n';
    expect(await h.lint(md)).toEqual([]);
  });
});
