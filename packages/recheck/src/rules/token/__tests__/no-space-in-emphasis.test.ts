import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-space-in-emphasis (MD037)', () => {
  const h = tokenRuleHarness('no-space-in-emphasis');

  it('passes clean emphasis with no interior spaces (asterisk and underscore)', async () => {
    expect(await h.lint('Here is some *italic* text and some **bold** text and _more_.\n')).toEqual(
      []
    );
  });

  it('flags bold asterisk markers with a leading and trailing space, exact line/column', async () => {
    const problems = await h.lint('Here is some ** bold ** text.\n');
    expect(problems).toHaveLength(2);
    // "Here is some ** bold ** text." -- first "**" ends at column 16.
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(16);
    // match includes the whitespace run plus one char of context on each
    // side (matches upstream's addError context construction verbatim).
    expect(problems[0].match).toBe('** b');
    // second "**" starts at column 22; column is adjusted back by the
    // matched whitespace-run length so it points at the first space.
    expect(problems[1].line).toBe(1);
    expect(problems[1].column).toBe(21);
    expect(problems[1].match).toBe('d **');
  });

  it('flags italic asterisk markers with spaces', async () => {
    const problems = await h.lint('Here is some * italic * text.\n');
    expect(problems).toHaveLength(2);
  });

  it('flags double-underscore bold markers with spaces', async () => {
    const problems = await h.lint('Here is some more __ bold __ text.\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].match).toBe('__ b');
    expect(problems[1].match).toBe('d __');
  });

  it('flags single-underscore italic markers with spaces', async () => {
    const problems = await h.lint('Here is some more _ italic _ text.\n');
    expect(problems).toHaveLength(2);
  });

  it('does not flag a real (successfully parsed) emphasis/strong span', async () => {
    expect(await h.lint('This is *emphasis* and this is **strong**.\n')).toEqual([]);
  });

  it('does not flag mid-word bare asterisks used as plain text, or a lone unpaired marker', async () => {
    // "a*b*c" parses as real emphasis (a, *b*, c) -- no bare marker at all.
    expect(await h.lint('a*b*c and a single * asterisk alone.\n')).toEqual([]);
  });

  it('does not flag emphasis-marker-like text inside a code span', async () => {
    expect(await h.lint('Use `* not emphasis *` in code.\n')).toEqual([]);
  });

  it('does not flag emphasis-marker-like text inside a fenced code block', async () => {
    expect(await h.lint('```\n* not emphasis *\n```\n')).toEqual([]);
  });

  it('handles nested emphasis (bold-in-italic) without false positives', async () => {
    expect(await h.lint('This is _**nested**_ emphasis.\n')).toEqual([]);
  });

  it('flags spaced bare markers that appear alongside real nested emphasis', async () => {
    // The pair of bare "*" tokens (mid-paragraph, unpaired with real
    // emphasis) that surround " not " should be flagged.
    const problems = await h.lint('Real *text* here, but * not * this pair.\n');
    expect(problems).toHaveLength(2);
  });

  it('produces the exact fixed output removing the interior spaces', async () => {
    const fixed = await h.fix('Here is some ** bold ** text.\n');
    expect(fixed).toBe('Here is some **bold** text.\n');
  });

  it('produces the exact fixed output for underscore markers', async () => {
    const fixed = await h.fix('Here is some more __ bold __ text.\n');
    expect(fixed).toBe('Here is some more __bold__ text.\n');
  });

  it('passes a document with no emphasis-like markers at all', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });

  it('does not treat a bare "*" inside a BLOCK-level HTML table cell as an emphasis marker (regression)', async () => {
    // Regression: found via the Task 12 differential parity harness on
    // mdn-content -- an HTML `<table>` with `<code>*</code>` cells (common
    // in "operator reference" docs) is block-level HTML (`htmlFlow`), which
    // now reparses its content as inline (see parser/index.ts's
    // `reparseHtmlFlow`). A lone `*` char in that reparsed content is a
    // bare `data` token, matching this rule's marker-detection shape, but
    // it's HTML table markup, not a markdown emphasis marker. Matches
    // upstream's own `!inHtmlFlow(child)` check in md037.mjs.
    const md = '<table>\n<tr><td><code>*</code></td><td>Multiply</td></tr>\n</table>\n';
    expect(await h.lint(md)).toEqual([]);
  });
});
