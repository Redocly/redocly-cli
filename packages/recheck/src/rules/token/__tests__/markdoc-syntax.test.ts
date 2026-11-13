import { describe, it, expect } from 'vitest';

import type { MarkdocSchema } from '../../../parser/markdoc/schema.js';
import { tokenRuleHarness } from './harness.js';

// Most tests run without a schema; this one is only for the tests that compare schema on and off.
const SCHEMA: MarkdocSchema = { tags: { img: { selfClosing: true } } };

const h = tokenRuleHarness('markdoc-syntax', {}, { markdoc: true });
const withSchema = tokenRuleHarness('markdoc-syntax', {}, { markdoc: true, markdocSchema: SCHEMA });

describe('markdoc-syntax', () => {
  it('no-ops cleanly when the markdoc flag is off (ctx.markdoc absent)', async () => {
    const off = tokenRuleHarness('markdoc-syntax');
    expect(await off.lint('{% img =broken %}\n')).toEqual([]);
  });

  it('reports a malformed-kind token with the parse reason in the message', async () => {
    const problems = await h.lint('{% img =broken %}\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].message).toContain('expected an attribute name');
    expect(problems[0].message).not.toContain('at position');
  });

  it('reports an opener missing its own %} whose only reachable close belongs to a later tag', async () => {
    // The `%}` that closes the next tag is taken as this tag's end, so the error is on line
    // 2's `{`.
    const problems = await h.lint('{% admonition\n{% /admonition %}\n');
    expect(problems).toHaveLength(1);
    expect([problems[0].line, problems[0].column]).toEqual([2, 1]);
  });

  // With no reachable `%}`, the text is not a tag at all, so nothing is reported.
  it('reports nothing for a truly unterminated {% (upstream treats it as literal text)', async () => {
    expect(await h.lint('Text {% admonition\n')).toEqual([]);
    expect(await h.lint('{% admonition\n')).toEqual([]);
    expect(await h.lint('{% admonition\n\nMore prose here.\n')).toEqual([]);
  });

  describe('malformed reports land on the offending character, in document coordinates', () => {
    it('single-line tag: the column is the absolute document column of the offence', async () => {
      const problems = await h.lint('{% img =broken %}\n');
      expect([problems[0].line, problems[0].column]).toEqual([1, 8]);
    });

    it('an indented tag: the indentation is included in the column', async () => {
      const problems = await h.lint('Before.\n\n    {% img =broken %}\n');
      expect([problems[0].line, problems[0].column]).toEqual([3, 12]);
    });

    it('a multi-line tag: the offence resolves onto its own line', async () => {
      // The `=` is on the tag's third line.
      const problems = await h.lint('{% img\n  src="a.png"\n  =broken\n%}\n');
      expect([problems[0].line, problems[0].column]).toEqual([3, 3]);
    });

    it('falls back to the tag start when the scanner had no single position', async () => {
      const problems = await h.lint('{%  %}\n');
      expect(problems).toHaveLength(1);
      expect([problems[0].line, problems[0].column]).toEqual([1, 1]);
      expect(problems[0].message).toContain('empty or contains only whitespace');
    });

    it('no reason ever quotes a span-relative offset', async () => {
      const problems = await h.lint(
        '{% img =broken %}\n\n{% t . %}\n\n{% t # %}\n\n{% fn(1 junk %}\n\n{%  %}\n'
      );
      expect(problems.length).toBeGreaterThan(0);
      for (const problem of problems) expect(problem.message).not.toContain('at position');
    });
  });

  it('reports nothing for clean, well-formed fixtures', async () => {
    const clean =
      '{% admonition type="info" %}\nBe careful.\n{% /admonition %}\n\n' +
      'Inline {% partial file="x.md" /%} tag.\n';
    expect(await h.lint(clean)).toEqual([]);
  });

  it('reports a bareword attribute value on a custom/unknown tag', async () => {
    const problems = await h.lint('{% widget name=star /%}\n');
    expect(problems.some((p) => p.message.includes('quote the value: name="star"'))).toBe(true);
  });

  it('reports a bareword attribute value identically under a real schema', async () => {
    const problems = await withSchema.lint('{% widget name=star /%}\n');
    expect(problems.some((p) => p.message.includes('quote the value: name="star"'))).toBe(true);
  });

  it('reports a bareword attribute value under schema: false too (grammar-level, not a schema check)', async () => {
    const noSchema = tokenRuleHarness('markdoc-syntax', {}, { markdoc: true, markdocSchema: null });
    const problems = await noSchema.lint('{% img name=star /%}\n');
    expect(problems.some((p) => p.message.includes('quote the value: name="star"'))).toBe(true);
  });

  it('reports a bareword primary value, showing the quoted fix in the message', async () => {
    const problems = await h.lint('{% if maybe %}\nx\n{% /if %}\n');
    expect(problems.some((p) => p.message.includes('quote the value: {% if "maybe" %}'))).toBe(
      true
    );
  });

  it('reports both a bareword primary AND a bareword attribute on the same tag', async () => {
    const problems = await h.lint('{% widget star name=star %}\nx\n{% /widget %}\n');
    expect(problems).toHaveLength(2);
    expect(problems.some((p) => p.message.includes('quote the value: {% widget "star" %}'))).toBe(
      true
    );
    expect(problems.some((p) => p.message.includes('quote the value: name="star"'))).toBe(true);
  });

  it('reports intra-tag problems in ascending document order, not check order', async () => {
    const problems = await h.lint('{% widget star name=star %}\nx\n{% /widget %}\n');
    expect(problems).toHaveLength(2);
    expect(problems.map((p) => p.column)).toEqual([11, 21]);
    expect(problems[0].message).toContain('quote the value: {% widget "star" %}');
    expect(problems[1].message).toContain('quote the value: name="star"');
  });

  // A close tag's attributes are deleted, so skip the bareword advice to avoid two conflicting
  // fixes.
  it('a close tag with a BAREWORD attribute reports only the close-attribute problem', async () => {
    const problems = await h.lint('{% t %}\nx\n{% /t a=b %}\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('must not carry attributes');
    expect(problems[0].message).not.toContain('quote the value');
  });

  it('the same bareword on an OPEN tag still gets the quote-the-value advice', async () => {
    const problems = await h.lint('{% t a=b %}\nx\n{% /t %}\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('quote the value: a="b"');
  });

  it("reports attributes on a close tag (recheck's documented TagClose divergence)", async () => {
    const problems = await h.lint('{% t %}\nx\n{% /t a=1 %}\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].message).toContain('"{% /t %}"');
    expect(problems[0].message).toContain('must not carry attributes');
  });

  it('never reports annotation, variable, or function kinds', async () => {
    const problems = await h.lint(
      '# Head {% #main %}\n\nHello {% $name %}.\n\nHello {% equals(1,1) %}.\n'
    );
    expect(problems).toEqual([]);
  });

  it('does not report trim markers, glued attributes, or duplicate attributes', async () => {
    // Trim markers, glued attributes (`a=1b=2`) and a repeated class shortcut are valid
    // syntax. Duplicates are checked by markdoc-attributes.
    const problems = await h.lint('{%- t a=1b=2 .a .a -%}\nx\n{%- /t -%}\n');
    expect(problems).toEqual([]);
  });
});
