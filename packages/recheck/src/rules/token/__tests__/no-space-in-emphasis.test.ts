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
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(16);
    expect(problems[0].match).toBe('** b');
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
    // "a*b*c" is real emphasis, so there is no bare marker.
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

  it('does not treat a bare "*" inside a BLOCK-level HTML table cell as an emphasis marker (regression)', async () => {
    // In block-level HTML (`<table>` with `<code>*</code>`), a lone `*` is not an emphasis marker.
    const md = '<table>\n<tr><td><code>*</code></td><td>Multiply</td></tr>\n</table>\n';
    expect(await h.lint(md)).toEqual([]);
  });
});
