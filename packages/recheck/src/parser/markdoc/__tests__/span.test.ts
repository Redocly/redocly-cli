import { describe, it, expect } from 'vitest';

import { parseMarkdocSpan } from '../span.js';

describe('parseMarkdocSpan', () => {
  it('open tag with string attribute', () => {
    const s = parseMarkdocSpan('{% admonition type="info" %}');
    expect(s).toMatchObject({ kind: 'tag-open', name: 'admonition' });
    expect(s.attributes).toEqual([
      expect.objectContaining({ name: 'type', valueKind: 'string', value: 'info' }),
    ]);
  });
  it('close tag', () => expect(parseMarkdocSpan('{% /admonition %}').kind).toBe('tag-close'));
  it('self-closing', () =>
    expect(parseMarkdocSpan('{% partial file="x.md" /%}').kind).toBe('tag-self-closing'));
  it('annotation', () => expect(parseMarkdocSpan('{% #main .wide %}').kind).toBe('annotation'));
  it('variable interpolation', () =>
    expect(parseMarkdocSpan('{% $userName %}').kind).toBe('variable'));
  it('whitespace-trim variant parses identically', () =>
    expect(parseMarkdocSpan('{%- admonition -%}').name).toBe('admonition'));
  it('number, boolean, null literals', () => {
    const s = parseMarkdocSpan('{% img width=640 lazy=true alt=null %}');
    expect(s.attributes.map((a) => a.valueKind)).toEqual(['number', 'boolean', 'null']);
  });
  it('array and object values captured raw', () => {
    const s = parseMarkdocSpan('{% tabs names=["a","b"] meta={x: 1} %}');
    expect(s.attributes.map((a) => a.valueKind)).toEqual(['array', 'object']);
  });
  it('variable and function values are opaque', () => {
    const s = parseMarkdocSpan('{% if condition=$flag other=default(1) %}');
    expect(s.attributes.map((a) => a.valueKind)).toEqual(['variable', 'function']);
  });
  // Markdoc rejects a bare word as a value. It gets its own `bareword` kind so a rule can point at
  // it.
  it('unquoted bare word is a distinct bareword kind (real Markdoc rejects it outright)', () =>
    expect(parseMarkdocSpan('{% icon name=star %}').attributes[0]).toMatchObject({
      valueKind: 'bareword',
      value: 'star',
    }));
  it('a bareword among valid attributes leaves the others kinds and offsets untouched', () => {
    const text = '{% icon name=star size=42 flag=true %}';
    const s = parseMarkdocSpan(text);
    expect(s.kind).toBe('tag-open'); // the SPAN stays structured, not malformed
    expect(
      s.attributes.map((a) => ({ name: a.name, valueKind: a.valueKind, value: a.value }))
    ).toEqual([
      { name: 'name', valueKind: 'bareword', value: 'star' },
      { name: 'size', valueKind: 'number', value: 42 },
      { name: 'flag', valueKind: 'boolean', value: true },
    ]);
    const size = s.attributes[1];
    expect(text.slice(size.nameStart, size.nameEnd)).toBe('size');
    expect(text.slice(size.valueStart, size.valueEnd)).toBe('42');
    const flag = s.attributes[2];
    expect(text.slice(flag.nameStart, flag.nameEnd)).toBe('flag');
    expect(text.slice(flag.valueStart, flag.valueEnd)).toBe('true');
  });
  it('bareword value offsets index the span text exactly', () => {
    const text = '{% icon name=star %}';
    const s = parseMarkdocSpan(text);
    expect(text.slice(s.attributes[0].valueStart, s.attributes[0].valueEnd)).toBe('star');
  });
  it('true, false, and null keywords never classify as bareword', () => {
    const s = parseMarkdocSpan('{% img lazy=true hidden=false alt=null %}');
    expect(s.attributes.map((a) => a.valueKind)).toEqual(['boolean', 'boolean', 'null']);
  });
  // Identifiers can start with a digit or a dash, for tag names and attribute names.
  it('a digit-leading tag name parses as tag-open', () => {
    const s = parseMarkdocSpan('{% 1x foo="bar" %}');
    expect(s).toMatchObject({ kind: 'tag-open', name: '1x' });
    expect(s.attributes[0]).toMatchObject({ name: 'foo', valueKind: 'string', value: 'bar' });
  });
  // ...except right after the tag name, where a leading number is read as a value. See 'first-slot
  // Value greed' below.
  it('a digit-leading attribute name parses in a non-first slot', () => {
    const s = parseMarkdocSpan('{% x foo="a" 1bar="b" %}');
    expect(s.kind).toBe('tag-open');
    expect(s.primary).toBeUndefined();
    expect(
      s.attributes.map((a) => ({ name: a.name, valueKind: a.valueKind, value: a.value }))
    ).toEqual([
      { name: 'foo', valueKind: 'string', value: 'a' },
      { name: '1bar', valueKind: 'string', value: 'b' },
    ]);
  });
  it('malformed: no closing delimiter inside span text', () => {
    const s = parseMarkdocSpan('{% admonition type="info"');
    expect(s.kind).toBe('malformed');
    expect(s.reason).toBeTruthy();
  });
  it('malformed: bad attribute syntax', () =>
    expect(parseMarkdocSpan('{% img =broken %}').kind).toBe('malformed'));
  it('offsets index the span text exactly', () => {
    const text = '{% admonition type="info" %}';
    const s = parseMarkdocSpan(text);
    expect(text.slice(s.nameStart, s.nameEnd)).toBe('admonition');
    const a = s.attributes[0];
    expect(text.slice(a.nameStart, a.nameEnd)).toBe('type');
    expect(text.slice(a.valueStart, a.valueEnd)).toBe('"info"');
  });

  describe('edge cases', () => {
    it('escaped quotes inside a string value are decoded', () => {
      const text = String.raw`{% img alt="say \"hi\"" %}`;
      const s = parseMarkdocSpan(text);
      const a = s.attributes[0];
      expect(a).toMatchObject({ valueKind: 'string', value: 'say "hi"' });
      expect(text.slice(a.valueStart, a.valueEnd)).toBe(String.raw`"say \"hi\""`);
    });

    it('a backslash-escaped backslash inside a string value is decoded', () => {
      const text = String.raw`{% img alt="a\\b" %}`;
      const s = parseMarkdocSpan(text);
      expect(s.attributes[0]).toMatchObject({ valueKind: 'string', value: 'a\\b' });
    });

    it('nested brackets in an array value are captured whole', () => {
      const text = '{% tabs names=["a", ["b", "c"]] %}';
      const s = parseMarkdocSpan(text);
      const a = s.attributes[0];
      expect(a.valueKind).toBe('array');
      expect(text.slice(a.valueStart, a.valueEnd)).toBe('["a", ["b", "c"]]');
    });

    it('nested object/array mix in an object value is captured whole', () => {
      const text = '{% tabs meta={a: [1, {b: 2}], c: "x"} %}';
      const s = parseMarkdocSpan(text);
      const a = s.attributes[0];
      expect(a.valueKind).toBe('object');
      expect(text.slice(a.valueStart, a.valueEnd)).toBe('{a: [1, {b: 2}], c: "x"}');
    });

    it('a bracket-like character inside a quoted string does not break balance counting', () => {
      const text = '{% tabs meta={title: "a]b}c"} %}';
      const s = parseMarkdocSpan(text);
      const a = s.attributes[0];
      expect(a.valueKind).toBe('object');
      expect(text.slice(a.valueStart, a.valueEnd)).toBe('{title: "a]b}c"}');
    });

    it('whitespace-only span is malformed', () => {
      const s = parseMarkdocSpan('{%   %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    it('empty span is malformed', () => {
      const s = parseMarkdocSpan('{%%}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    it('garbage input that is not a span at all is malformed, never throws', () => {
      expect(() => parseMarkdocSpan('')).not.toThrow();
      expect(parseMarkdocSpan('').kind).toBe('malformed');
      expect(() => parseMarkdocSpan('not a span')).not.toThrow();
      expect(parseMarkdocSpan('not a span').kind).toBe('malformed');
    });

    it('unterminated string value inside an otherwise-closed span is malformed', () => {
      const s = parseMarkdocSpan('{% img alt="unterminated %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    it('negative numbers are parsed', () => {
      const s = parseMarkdocSpan('{% img offset=-10 %}');
      expect(s.attributes[0]).toMatchObject({ valueKind: 'number', value: -10 });
    });

    it('decimal numbers are parsed', () => {
      const s = parseMarkdocSpan('{% img ratio=1.5 %}');
      expect(s.attributes[0]).toMatchObject({ valueKind: 'number', value: 1.5 });
    });

    // Markdoc numbers have no exponent, so `2e3` stops after `2` and `e3` is left over.
    it('exponent notation is not a number (real Markdoc has no exponent production)', () => {
      const s = parseMarkdocSpan('{% img ratio=1.5 scale=2e3 %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    it('a variable value with a dotted path is captured raw', () => {
      const s = parseMarkdocSpan('{% if condition=$user.isAdmin %}');
      const a = s.attributes[0];
      expect(a).toMatchObject({ valueKind: 'variable', value: '$user.isAdmin' });
    });
  });

  // The value right after the tag name, as in `{% if $flag %}`. Markdoc assigns it to the attribute
  // named `primary`.
  describe('primary value', () => {
    it('a variable primary is captured with zero attributes', () => {
      const text = '{% if $sidebar %}';
      const s = parseMarkdocSpan(text);
      expect(s).toMatchObject({ kind: 'tag-open', name: 'if' });
      expect(s.primary).toMatchObject({ valueKind: 'variable', value: '$sidebar' });
      expect(s.attributes).toEqual([]);
      const primary = s.primary;
      expect(primary && text.slice(primary.valueStart, primary.valueEnd)).toBe('$sidebar');
    });
    it('a function-call primary keeps its raw source as the value', () => {
      const text = '{% if equals($env, "prod") %}';
      const s = parseMarkdocSpan(text);
      expect(s.primary).toMatchObject({
        valueKind: 'function',
        value: 'equals($env, "prod")',
      });
      const primary = s.primary;
      expect(primary && text.slice(primary.valueStart, primary.valueEnd)).toBe(
        'equals($env, "prod")'
      );
    });
    it('a boolean literal primary decodes to true', () => {
      const text = '{% if true %}';
      const s = parseMarkdocSpan(text);
      expect(s.primary).toMatchObject({ valueKind: 'boolean', value: true });
      const primary = s.primary;
      expect(primary && text.slice(primary.valueStart, primary.valueEnd)).toBe('true');
    });
    it('a quoted string primary is decoded', () => {
      const text = '{% key "display-name" %}';
      const s = parseMarkdocSpan(text);
      expect(s.primary).toMatchObject({ valueKind: 'string', value: 'display-name' });
      const primary = s.primary;
      expect(primary && text.slice(primary.valueStart, primary.valueEnd)).toBe('"display-name"');
    });
    it('a primary followed by named attributes captures both, with exact offsets', () => {
      const text = '{% image "a.png" width=100 %}';
      const s = parseMarkdocSpan(text);
      expect(s.primary).toMatchObject({ valueKind: 'string', value: 'a.png' });
      expect(s.attributes).toEqual([
        expect.objectContaining({ name: 'width', valueKind: 'number', value: 100 }),
      ]);
      const primary = s.primary;
      expect(primary && text.slice(primary.valueStart, primary.valueEnd)).toBe('"a.png"');
      const width = s.attributes[0];
      expect(text.slice(width.nameStart, width.nameEnd)).toBe('width');
      expect(text.slice(width.valueStart, width.valueEnd)).toBe('100');
    });
    it('no primary and no attributes stays a valid tag-open', () => {
      const s = parseMarkdocSpan('{% if %}');
      expect(s.kind).toBe('tag-open');
      expect(s.primary).toBeUndefined();
      expect(s.attributes).toEqual([]);
    });
    // Markdoc rejects a bare word here too. It is captured so a rule can flag it.
    it('a bareword primary is captured, not malformed', () => {
      const text = '{% if maybe %}';
      const s = parseMarkdocSpan(text);
      expect(s.kind).toBe('tag-open');
      expect(s.primary).toMatchObject({ valueKind: 'bareword', value: 'maybe' });
      const primary = s.primary;
      expect(primary && text.slice(primary.valueStart, primary.valueEnd)).toBe('maybe');
    });
    it('a bareword primary among named attributes leaves the attributes untouched (regression guard)', () => {
      const s = parseMarkdocSpan('{% if maybe size=42 %}');
      expect(s.kind).toBe('tag-open');
      expect(s.primary).toMatchObject({ valueKind: 'bareword', value: 'maybe' });
      expect(s.attributes).toEqual([
        expect.objectContaining({ name: 'size', valueKind: 'number', value: 42 }),
      ]);
    });
    it('an identifier that is no Value, followed by "=", is an attribute name', () => {
      // `type` is not a value, so it is read as an attribute name, not a primary value.
      const s = parseMarkdocSpan('{% admonition type="info" %}');
      expect(s.primary).toBeUndefined();
      expect(s.attributes).toEqual([
        expect.objectContaining({ name: 'type', valueKind: 'string', value: 'info' }),
      ]);
    });

    // Markdoc reads a value right after the tag name before any attributes, and a number takes all
    // its digits. So `{% icon 1x="star" %}` is primary `1` plus attribute `x="star"`. If what is
    // left can't start an attribute, the span is malformed.
    describe('first-slot Value greed', () => {
      it('a digit-leading first slot yields a number primary plus the leftover attribute', () => {
        const text = '{% icon 1x="star" %}';
        const s = parseMarkdocSpan(text);
        expect(s).toMatchObject({ kind: 'tag-open', name: 'icon' });
        expect(s.primary).toMatchObject({ valueKind: 'number', value: 1 });
        const primary = s.primary;
        expect(primary && text.slice(primary.valueStart, primary.valueEnd)).toBe('1');
        expect(s.attributes).toEqual([
          expect.objectContaining({ name: 'x', valueKind: 'string', value: 'star' }),
        ]);
        const x = s.attributes[0];
        expect(text.slice(x.nameStart, x.nameEnd)).toBe('x');
        expect(text.slice(x.valueStart, x.valueEnd)).toBe('"star"');
      });

      it('an all-digit first slot leaves an "=" no attribute name can start with', () => {
        const s = parseMarkdocSpan('{% t 123="x" %}');
        expect(s.kind).toBe('malformed');
        expect(s.reason).toBeTruthy();
      });

      it('a digit-leading bare identifier in the first slot is malformed', () => {
        const s = parseMarkdocSpan('{% t 1x %}');
        expect(s.kind).toBe('malformed');
        expect(s.reason).toBeTruthy();
      });

      it('a decimal primary stops at the fraction, so a trailing identifier is malformed', () => {
        const s = parseMarkdocSpan('{% t 1.5x %}');
        expect(s.kind).toBe('malformed');
        expect(s.reason).toBeTruthy();
      });

      it('a decimal alone is a number primary', () => {
        const text = '{% t 1.5 %}';
        const s = parseMarkdocSpan(text);
        expect(s.kind).toBe('tag-open');
        expect(s.primary).toMatchObject({ valueKind: 'number', value: 1.5 });
        const primary = s.primary;
        expect(primary && text.slice(primary.valueStart, primary.valueEnd)).toBe('1.5');
      });

      // `-` is both part of an identifier and a number sign; the number wins.
      it('a signed digit run wins the first slot over the identifier reading', () => {
        const text = '{% t -2 %}';
        const s = parseMarkdocSpan(text);
        expect(s.primary).toMatchObject({ valueKind: 'number', value: -2 });
        const primary = s.primary;
        expect(primary && text.slice(primary.valueStart, primary.valueEnd)).toBe('-2');
      });

      it('a signed digit run followed by an identifier is malformed', () => {
        const s = parseMarkdocSpan('{% t -2x %}');
        expect(s.kind).toBe('malformed');
        expect(s.reason).toBeTruthy();
      });

      it('a number primary followed by a named attribute captures both', () => {
        const text = '{% t 1 x="y" %}';
        const s = parseMarkdocSpan(text);
        expect(s.primary).toMatchObject({ valueKind: 'number', value: 1 });
        const primary = s.primary;
        expect(primary && text.slice(primary.valueStart, primary.valueEnd)).toBe('1');
        const x = s.attributes[0];
        expect(x).toMatchObject({ name: 'x', valueKind: 'string', value: 'y' });
        expect(text.slice(x.nameStart, x.nameEnd)).toBe('x');
        expect(text.slice(x.valueStart, x.valueEnd)).toBe('"y"');
      });

      // `null`, `true` and `false` are values, so they win the first slot and the `=` is left over.
      it('a keyword literal wins the first slot, so "null=1" there is malformed', () => {
        expect(parseMarkdocSpan('{% t null=1 %}').kind).toBe('malformed');
        expect(parseMarkdocSpan('{% t true=1 %}').kind).toBe('malformed');
      });

      // After the first slot there is no value attempt, so a bare word is a missing-`=` error, not
      // a bareword.
      it('a bare identifier in a later slot needs an "=" and is malformed without one', () => {
        const s = parseMarkdocSpan('{% t a=1 foo %}');
        expect(s.kind).toBe('malformed');
        expect(s.reason).toBeTruthy();
      });

      it('Value kinds real Markdoc accepts in the first slot keep their kind and offsets', () => {
        const varText = '{% if $flag %}';
        const varSpan = parseMarkdocSpan(varText);
        expect(varSpan.primary).toMatchObject({ valueKind: 'variable', value: '$flag' });
        const varPrimary = varSpan.primary;
        expect(varPrimary && varText.slice(varPrimary.valueStart, varPrimary.valueEnd)).toBe(
          '$flag'
        );

        const fnText = '{% t fn(1,"x") %}';
        const fnSpan = parseMarkdocSpan(fnText);
        expect(fnSpan.primary).toMatchObject({ valueKind: 'function', value: 'fn(1,"x")' });
        const fnPrimary = fnSpan.primary;
        expect(fnPrimary && fnText.slice(fnPrimary.valueStart, fnPrimary.valueEnd)).toBe(
          'fn(1,"x")'
        );
      });
    });

    // Only one whitespace character may separate the primary from the attributes. One space, tab or
    // newline is fine; two spaces, or a newline plus indentation, is an error. Other gaps are not
    // limited.
    describe('whitespace between the primary and the attribute list', () => {
      it('two spaces after the primary is malformed', () => {
        const s = parseMarkdocSpan('{% t 1  x="y" %}');
        expect(s.kind).toBe('malformed');
        expect(s.reason).toBeTruthy();
      });

      it('a newline plus indentation after the primary is malformed', () => {
        const s = parseMarkdocSpan('{% image "a.png"\n  width=100 %}');
        expect(s.kind).toBe('malformed');
        expect(s.reason).toBeTruthy();
      });

      it('exactly one newline after the primary parses', () => {
        const s = parseMarkdocSpan('{% image "a.png"\nwidth=100 %}');
        expect(s.kind).toBe('tag-open');
        expect(s.primary).toMatchObject({ valueKind: 'string', value: 'a.png' });
        expect(s.attributes[0]).toMatchObject({ name: 'width', value: 100 });
      });

      it('one tab after the primary parses', () => {
        const s = parseMarkdocSpan('{% t 1\tx="y" %}');
        expect(s.kind).toBe('tag-open');
        expect(s.attributes[0]).toMatchObject({ name: 'x', value: 'y' });
      });

      it('unbounded whitespace before the primary and between attributes parses', () => {
        const s = parseMarkdocSpan('{% t   1 x="y"  z=2 %}');
        expect(s.kind).toBe('tag-open');
        expect(s.primary).toMatchObject({ valueKind: 'number', value: 1 });
        expect(s.attributes.map((a) => a.name)).toEqual(['x', 'z']);
      });

      it('trailing whitespace after a primary with no attributes parses', () => {
        const s = parseMarkdocSpan('{% t 1  %}');
        expect(s.kind).toBe('tag-open');
        expect(s.primary).toMatchObject({ valueKind: 'number', value: 1 });
      });

      it('a self-closing marker after extra whitespace parses', () => {
        const s = parseMarkdocSpan('{% t 1  /%}');
        expect(s.kind).toBe('tag-self-closing');
        expect(s.primary).toMatchObject({ valueKind: 'number', value: 1 });
      });

      // Line endings are not normalized, so span text can contain CRLF. A CRLF counts as one
      // whitespace unit.
      it('a CRLF pair after the primary counts as one whitespace unit and parses', () => {
        const s = parseMarkdocSpan('{% image "a.png"\r\nwidth=100 %}');
        expect(s.kind).toBe('tag-open');
        expect(s.primary).toMatchObject({ valueKind: 'string', value: 'a.png' });
        expect(s.attributes[0]).toMatchObject({ name: 'width', value: 100 });
      });

      it('a CRLF pair before a bareword identifier attribute also counts as one unit', () => {
        const s = parseMarkdocSpan('{% if $flag\r\nother=1 %}');
        expect(s.kind).toBe('tag-open');
        expect(s.attributes[0]).toMatchObject({ name: 'other', value: 1 });
      });

      it('a CRLF pair before a self-closing tag attribute counts as one unit', () => {
        const s = parseMarkdocSpan('{% if $flag\r\nx=1 /%}');
        expect(s.kind).toBe('tag-self-closing');
        expect(s.attributes[0]).toMatchObject({ name: 'x', value: 1 });
      });

      it('a lone CR after the primary still parses (unchanged from before)', () => {
        const s = parseMarkdocSpan('{% t 1\rx=1 %}');
        expect(s.kind).toBe('tag-open');
        expect(s.attributes[0]).toMatchObject({ name: 'x', value: 1 });
      });

      it('two consecutive CRLF pairs after the primary is malformed (two whitespace units)', () => {
        const s = parseMarkdocSpan('{% t 1\r\n\r\nx=1 %}');
        expect(s.kind).toBe('malformed');
        expect(s.reason).toContain('only one whitespace character');
      });

      it('two lone CRs after the primary is malformed (two whitespace units)', () => {
        const s = parseMarkdocSpan('{% t 1\r\rx=1 %}');
        expect(s.kind).toBe('malformed');
        expect(s.reason).toContain('only one whitespace character');
      });

      // Form feed and vertical tab are not Markdoc whitespace, so they are rejected by the normal
      // attribute scan, not the one-whitespace check.
      it('a form feed after the primary is malformed, not counted as whitespace', () => {
        const s = parseMarkdocSpan('{% t 1\fx=1 %}');
        expect(s.kind).toBe('malformed');
        expect(s.reason).not.toContain('only one whitespace character');
      });

      it('a vertical tab after the primary is malformed, not counted as whitespace', () => {
        const s = parseMarkdocSpan('{% t 1\vx=1 %}');
        expect(s.kind).toBe('malformed');
        expect(s.reason).not.toContain('only one whitespace character');
      });
    });
  });

  // No spaces are allowed around `=`. Whitespace only separates one attribute from the next.
  describe('spaces around an attribute "="', () => {
    it('spaces on both sides of "=" are malformed', () => {
      const s = parseMarkdocSpan('{% t a = 1 %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toContain("no spaces around an attribute's '='");
    });

    it('a space after "=" is malformed', () => {
      const s = parseMarkdocSpan('{% t a= 1 %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toContain("no spaces around an attribute's '='");
    });

    it('a space before "=" is malformed', () => {
      const s = parseMarkdocSpan('{% t a =1 %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toContain("no spaces around an attribute's '='");
    });

    it('the unspaced spelling still parses', () => {
      const s = parseMarkdocSpan('{% t a=1 %}');
      expect(s.kind).toBe('tag-open');
      expect(s.attributes[0]).toMatchObject({ name: 'a', valueKind: 'number', value: 1 });
    });

    // A name with no `=` at all is a different error, so it keeps the plain message.
    it('a name with no "=" at all reports the plain missing-"=" reason', () => {
      const s = parseMarkdocSpan('{% t a %}');
      expect(s.primary).toMatchObject({ valueKind: 'bareword', value: 'a' });
      const missing = parseMarkdocSpan('{% t a=1 b %}');
      expect(missing.kind).toBe('malformed');
      expect(missing.reason).not.toContain('no spaces');
    });
  });

  // Shortcuts are not in `attributes`. They are in `shortcuts`, in source order.
  describe('class/id shortcuts', () => {
    it('a class shortcut on its own', () => {
      const text = '{% t .foo %}';
      const s = parseMarkdocSpan(text);
      expect(s.kind).toBe('tag-open');
      expect(s.attributes).toEqual([]);
      expect(s.shortcuts).toEqual([{ kind: 'class', name: 'foo', start: 5, end: 9 }]);
      const shortcut = s.shortcuts?.[0];
      expect(shortcut && text.slice(shortcut.start, shortcut.end)).toBe('.foo');
    });

    it('an id shortcut on its own', () => {
      const text = '{% t #bar %}';
      const s = parseMarkdocSpan(text);
      expect(s.kind).toBe('tag-open');
      expect(s.shortcuts).toEqual([{ kind: 'id', name: 'bar', start: 5, end: 9 }]);
      const shortcut = s.shortcuts?.[0];
      expect(shortcut && text.slice(shortcut.start, shortcut.end)).toBe('#bar');
    });

    it('the corpus case: a class shortcut after a named attribute', () => {
      const text = '{% admonition type="info" .smaller-admonition-margins %}';
      const s = parseMarkdocSpan(text);
      expect(s.kind).toBe('tag-open');
      expect(s.attributes).toEqual([
        expect.objectContaining({ name: 'type', valueKind: 'string', value: 'info' }),
      ]);
      expect(s.shortcuts).toEqual([
        { kind: 'class', name: 'smaller-admonition-margins', start: 26, end: 53 },
      ]);
      const shortcut = s.shortcuts?.[0];
      expect(shortcut && text.slice(shortcut.start, shortcut.end)).toBe(
        '.smaller-admonition-margins'
      );
    });

    it('a class shortcut before a named attribute', () => {
      const text = '{% t .a b=1 %}';
      const s = parseMarkdocSpan(text);
      expect(s.kind).toBe('tag-open');
      expect(s.shortcuts).toEqual([{ kind: 'class', name: 'a', start: 5, end: 7 }]);
      expect(s.attributes).toEqual([
        expect.objectContaining({ name: 'b', valueKind: 'number', value: 1 }),
      ]);
    });

    it('multiple shortcuts accumulate in source order', () => {
      const text = '{% t .a .b #c %}';
      const s = parseMarkdocSpan(text);
      expect(s.kind).toBe('tag-open');
      expect(s.shortcuts).toEqual([
        { kind: 'class', name: 'a', start: 5, end: 7 },
        { kind: 'class', name: 'b', start: 8, end: 10 },
        { kind: 'id', name: 'c', start: 11, end: 13 },
      ]);
    });

    it('a primary value followed by a class shortcut', () => {
      const text = '{% image "a.png" .wide %}';
      const s = parseMarkdocSpan(text);
      expect(s.kind).toBe('tag-open');
      expect(s.primary).toMatchObject({ valueKind: 'string', value: 'a.png' });
      expect(s.shortcuts).toEqual([{ kind: 'class', name: 'wide', start: 17, end: 22 }]);
    });

    // Items after the first need whitespace between them, so both of these are errors.
    it('adjacent shortcuts with no separating whitespace are malformed (id after class)', () => {
      const s = parseMarkdocSpan('{% t .a#b %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    it('adjacent shortcuts with no separating whitespace are malformed (class after class)', () => {
      const s = parseMarkdocSpan('{% t .a.b %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    // The number takes only one fraction (`1.5`), so `.5` is left and read as a class shortcut.
    it('a decimal primary followed immediately by a numeric class name (number greed)', () => {
      const text = '{% t 1.5.5 %}';
      const s = parseMarkdocSpan(text);
      expect(s.kind).toBe('tag-open');
      expect(s.primary).toMatchObject({ valueKind: 'number', value: 1.5 });
      expect(s.shortcuts).toEqual([{ kind: 'class', name: '5', start: 8, end: 10 }]);
    });

    // Digit-leading shortcut names are valid, like tag and attribute names.
    it('a digit-leading class name', () => {
      const s = parseMarkdocSpan('{% t .1x %}');
      expect(s.shortcuts).toEqual([{ kind: 'class', name: '1x', start: 5, end: 8 }]);
    });

    it('a digit-leading id name', () => {
      const s = parseMarkdocSpan('{% t #1x %}');
      expect(s.shortcuts).toEqual([{ kind: 'id', name: '1x', start: 5, end: 8 }]);
    });

    // A sigil must be followed by an identifier.
    it('a bare "." with no name is malformed', () => {
      const s = parseMarkdocSpan('{% t . %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
      expect(s.reason).toContain('expected an identifier after "."');
      expect(s.reasonOffset).toBe(5);
    });

    it('a bare "#" with no name is malformed', () => {
      const s = parseMarkdocSpan('{% t # %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
      expect(s.reason).toContain('expected an identifier after "#"');
      expect(s.reasonOffset).toBe(5);
    });

    it('a shortcut in a self-closing tag', () => {
      const text = '{% t .a /%}';
      const s = parseMarkdocSpan(text);
      expect(s.kind).toBe('tag-self-closing');
      expect(s.shortcuts).toEqual([{ kind: 'class', name: 'a', start: 5, end: 7 }]);
    });

    // Markdoc close tags have no attributes. Here they may, but shortcuts are still not recognized,
    // so this is malformed.
    it('a close tag with a shortcut stays malformed (close-tag behavior unchanged)', () => {
      const s = parseMarkdocSpan('{% /t .a %}');
      expect(s.kind).toBe('malformed');
    });

    // No value starts with a sigil, so this stays malformed.
    it('a sigil in attribute-value position is malformed, not a shortcut', () => {
      const s = parseMarkdocSpan('{% t x=.foo %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    it('a wide gap between two shortcuts still parses (TagAttributesTail allows _+)', () => {
      const s = parseMarkdocSpan('{% t .a  .b %}');
      expect(s.kind).toBe('tag-open');
      expect(s.shortcuts).toEqual([
        { kind: 'class', name: 'a', start: 5, end: 7 },
        { kind: 'class', name: 'b', start: 9, end: 11 },
      ]);
    });

    // The one-whitespace rule after a primary also applies when a shortcut follows.
    it('exactly one space between a primary and a following shortcut parses', () => {
      const s = parseMarkdocSpan('{% t 1 .a %}');
      expect(s.kind).toBe('tag-open');
      expect(s.primary).toMatchObject({ valueKind: 'number', value: 1 });
      expect(s.shortcuts).toEqual([{ kind: 'class', name: 'a', start: 7, end: 9 }]);
    });

    it('two spaces between a primary and a following shortcut is malformed', () => {
      const s = parseMarkdocSpan('{% t 1  .a %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toContain(
        "only one whitespace character may separate a tag's primary value from its first attribute"
      );
    });

    // A shortcut may follow the tag name with no whitespace.
    it('a shortcut immediately after the tag name with no whitespace', () => {
      const text = '{% t.a %}';
      const s = parseMarkdocSpan(text);
      expect(s.kind).toBe('tag-open');
      expect(s.name).toBe('t');
      expect(s.shortcuts).toEqual([{ kind: 'class', name: 'a', start: 4, end: 6 }]);
      const shortcut = s.shortcuts?.[0];
      expect(shortcut && text.slice(shortcut.start, shortcut.end)).toBe('.a');
    });

    it('an id shortcut immediately after the tag name with no whitespace', () => {
      const s = parseMarkdocSpan('{% t#a %}');
      expect(s.kind).toBe('tag-open');
      expect(s.shortcuts).toEqual([{ kind: 'id', name: 'a', start: 4, end: 6 }]);
    });

    // A number ends where the sigil begins, but a separator is still required.
    it('an attribute value directly followed by a shortcut with no whitespace is malformed', () => {
      const s = parseMarkdocSpan('{% t b=1.a %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    // The shortcut takes the whole name, so `=1` is left and fails the attribute name scan.
    it('a shortcut directly followed by "=value" with no whitespace is malformed', () => {
      const s = parseMarkdocSpan('{% t .ab=1 %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    it('a single span mixing primary, attributes, and shortcuts', () => {
      const text = '{% image "a.png" .wide alt="text" #cover %}';
      const s = parseMarkdocSpan(text);
      expect(s.kind).toBe('tag-open');
      expect(s.primary).toMatchObject({ valueKind: 'string', value: 'a.png' });
      expect(s.attributes).toEqual([
        expect.objectContaining({ name: 'alt', valueKind: 'string', value: 'text' }),
      ]);
      expect(s.shortcuts).toEqual([
        { kind: 'class', name: 'wide', start: 17, end: 22 },
        { kind: 'id', name: 'cover', start: 34, end: 40 },
      ]);
      const [wide, cover] = s.shortcuts ?? [];
      expect(text.slice(wide.start, wide.end)).toBe('.wide');
      expect(text.slice(cover.start, cover.end)).toBe('#cover');
    });

    it('a tag with no shortcuts leaves the field undefined', () => {
      const s = parseMarkdocSpan('{% admonition type="info" %}');
      expect(s.shortcuts).toBeUndefined();
    });
  });

  // A variable tail is `.name` or `[index]`, where the index is a number or a quoted string.
  describe('variable interpolation tail', () => {
    it.each([
      ['{% $frontmatter.title %}'],
      ['{% $env.PUBLIC_CUSTOM_VARIABLE %}'],
      ['{% $foo.bar.baz %}'],
      ['{% $foo["bar"] %}'],
      ['{% $foo[0] %}'],
      ['{% $foo[-1] %}'],
      ['{% $foo["a"]["b"] %}'],
      ['{% $foo.bar["x"].baz %}'],
      ['{% $foo[0][1] %}'],
      [String.raw`{% $foo["a\"b"] %}`],
    ])('accepts the dotted/bracket tail in %s', (text) => {
      expect(parseMarkdocSpan(text).kind).toBe('variable');
    });

    // Span texts from the Redocly docs.
    it('every corpus span text parses as a variable', () => {
      const corpus = [
        '{% $frontmatter.title %}',
        '{% $frontmatter.author %}',
        '{% $env.PUBLIC_REDOCLY_BRANCH_NAME %}',
        '{% $env.PUBLIC_CUSTOM_VARIABLE %}',
        '{% $env.PUBLIC_PORTAL_NAME %}',
      ];
      for (const text of corpus) {
        expect(parseMarkdocSpan(text).kind).toBe('variable');
      }
    });

    // A bracket index must be a number or a quoted string, and no whitespace is allowed in the
    // tail.
    it.each([
      ['{% $foo. %}'],
      ['{% $foo..bar %}'],
      ['{% $ %}'],
      ['{% $foo.bar junk %}'],
      ['{% $foo .bar %}'],
      ['{% $foo["unterminated %}'],
      ['{% $foo] %}'],
      ['{% $foo[bar] %}'],
      ['{% $foo[ 0 ] %}'],
      ['{% $foo[] %}'],
    ])('rejects %s as malformed', (text) => {
      const s = parseMarkdocSpan(text);
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    // Bracket indices also work in an attribute value.
    it('a bracket-indexed variable in VALUE position is captured raw', () => {
      const text = '{% t x=$foo["bar"] %}';
      const s = parseMarkdocSpan(text);
      const a = s.attributes[0];
      expect(a).toMatchObject({ valueKind: 'variable', value: '$foo["bar"]' });
      expect(text.slice(a.valueStart, a.valueEnd)).toBe('$foo["bar"]');
    });

    it('a mixed dotted/bracket-indexed variable in VALUE position is captured raw', () => {
      const text = '{% t x=$foo.bar["x"].baz %}';
      const s = parseMarkdocSpan(text);
      const a = s.attributes[0];
      expect(a).toMatchObject({ valueKind: 'variable', value: '$foo.bar["x"].baz' });
      expect(text.slice(a.valueStart, a.valueEnd)).toBe('$foo.bar["x"].baz');
    });

    it('a trailing dot with no identifier in VALUE position is malformed', () => {
      const s = parseMarkdocSpan('{% t x=$foo. %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });
  });

  // `@foo` is a variable like `$foo`, tail included.
  describe('@-prefixed variables', () => {
    it('a bare @ variable is accepted', () => {
      expect(parseMarkdocSpan('{% @foo %}').kind).toBe('variable');
    });

    it('a dotted @ variable is accepted', () => {
      expect(parseMarkdocSpan('{% @foo.bar %}').kind).toBe('variable');
    });

    it('a bracket-indexed @ variable is accepted', () => {
      expect(parseMarkdocSpan('{% @foo["a"] %}').kind).toBe('variable');
    });

    it('a digit-leading @ variable name is accepted (Identifier is uniform)', () => {
      expect(parseMarkdocSpan('{% @1x %}').kind).toBe('variable');
    });

    it('a bare "@" with no identifier is malformed', () => {
      const s = parseMarkdocSpan('{% @ %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toContain('variable interpolation is missing a name after "@"');
    });

    it('a trailing dot with no following identifier is malformed', () => {
      const s = parseMarkdocSpan('{% @foo. %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    // A trailing `/` is ignored, as with `{% $foo/%}`. Markdoc rejects both.
    it('a trailing self-close marker is ignored, unlike upstream (ledgered divergence)', () => {
      expect(parseMarkdocSpan('{% @foo/%}').kind).toBe('variable');
    });

    it('an @ variable in attribute VALUE position is captured raw', () => {
      const text = '{% t x=@foo %}';
      const s = parseMarkdocSpan(text);
      const a = s.attributes[0];
      expect(a).toMatchObject({ valueKind: 'variable', value: '@foo' });
      expect(text.slice(a.valueStart, a.valueEnd)).toBe('@foo');
    });

    it('a dotted @ variable in attribute VALUE position is captured raw', () => {
      const text = '{% t x=@foo.bar %}';
      const s = parseMarkdocSpan(text);
      const a = s.attributes[0];
      expect(a).toMatchObject({ valueKind: 'variable', value: '@foo.bar' });
      expect(text.slice(a.valueStart, a.valueEnd)).toBe('@foo.bar');
    });

    it('an @ variable named-attribute value (non-primary slot) is captured raw', () => {
      const text = '{% if condition=@flag %}';
      const s = parseMarkdocSpan(text);
      const a = s.attributes[0];
      expect(a).toMatchObject({ name: 'condition', valueKind: 'variable', value: '@flag' });
    });
  });

  // A bare function call is its own form, not a tag followed by `(`.
  describe('bare function interpolation', () => {
    it('a simple function call is accepted', () => {
      expect(parseMarkdocSpan('{% equals(1,1) %}').kind).toBe('function');
    });

    it('a function call with no arguments is accepted', () => {
      expect(parseMarkdocSpan('{% fn() %}').kind).toBe('function');
    });

    it('nested function calls are accepted', () => {
      expect(parseMarkdocSpan('{% default(concat($a,"b"),1) %}').kind).toBe('function');
    });

    it('a named function argument is accepted (interior stays opaque either way)', () => {
      expect(parseMarkdocSpan('{% fn(a=1) %}').kind).toBe('function');
    });

    it('a digit-leading function name is accepted (Identifier is uniform)', () => {
      expect(parseMarkdocSpan('{% 1x() %}').kind).toBe('function');
    });

    // Span texts from the Redocly docs.
    it('every corpus span text parses as a function', () => {
      const corpus = [
        '{% default($user.email, "Redocker") %}',
        '{% concat($frontmatter.data.firstName, " ", $frontmatter.data.lastName) %}',
      ];
      for (const text of corpus) {
        expect(parseMarkdocSpan(text).kind).toBe('function');
      }
    });

    it('the parsed shape carries no internals, matching the variable kind', () => {
      const s = parseMarkdocSpan('{% equals(1,1) %}');
      expect(s).toEqual({ kind: 'function', name: null, attributes: [], nameStart: 0, nameEnd: 0 });
    });

    // The `(` must directly follow the name. With a space it is read as a tag, which fails.
    it('a space before the opening paren is malformed (Function never engages)', () => {
      const s = parseMarkdocSpan('{% fn (1) %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    it('unterminated parentheses are malformed', () => {
      const s = parseMarkdocSpan('{% fn(1 %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    it('trailing content after the call is malformed (no fallback to a tag reading)', () => {
      const s = parseMarkdocSpan('{% fn(1) junk %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    // Markdoc rejects a trailing comma in function arguments. Function contents are only checked
    // for balanced brackets here, so it parses.
    it('a trailing comma in the argument list is accepted here (ledgered divergence)', () => {
      expect(parseMarkdocSpan('{% fn(1,) %}').kind).toBe('function');
    });

    // A trailing `/` is ignored here, as for a variable. Markdoc rejects it.
    it('a trailing self-close marker is ignored, unlike upstream (ledgered divergence)', () => {
      expect(parseMarkdocSpan('{% fn(1)/%}').kind).toBe('function');
    });
  });

  // Markdoc tries the annotation form before the tag form, so a body of only attributes and
  // shortcuts is an annotation.
  describe('attribute-first annotations', () => {
    it.each([
      ['{% width="30%" %}'],
      ['{% colspan=2 align="center" %}'],
      ['{% class="highlight" %}'],
      ['{% a=1 %}'],
      ['{% a=1 b=2 %}'],
      ['{% a=[1,2] %}'],
      ['{% a={x: 1} %}'],
      ['{% a=fn(1) %}'],
      ['{% a=$var %}'],
      ['{% a=null %}'],
      ['{% a=true %}'],
      // A digit-leading attribute name is valid here too.
      ['{% 1x=2 %}'],
    ])('%s classifies annotation (upstream-valid)', (span) => {
      expect(parseMarkdocSpan(span).kind).toBe('annotation');
    });

    it.each([['{% class="x" #id .cls %}'], ['{% a=1 .cls %}'], ['{% a=1 #id %}']])(
      '%s mixes attributes with shortcuts and still classifies annotation',
      (span) => {
        expect(parseMarkdocSpan(span).kind).toBe('annotation');
      }
    );

    it('the body stays unparsed, exactly like the sigil-first form', () => {
      expect(parseMarkdocSpan('{% width="30%" %}')).toEqual({
        kind: 'annotation',
        name: null,
        attributes: [],
        nameStart: 0,
        nameEnd: 0,
      });
    });

    it('the sigil-first form is unchanged', () => {
      expect(parseMarkdocSpan('{% #main .wide %}').kind).toBe('annotation');
      expect(parseMarkdocSpan('{% .foo %}').kind).toBe('annotation');
      expect(parseMarkdocSpan('{% #id %}').kind).toBe('annotation');
    });

    // Annotation bodies are not parsed, so these invalid bodies must stay malformed.
    it.each([
      // trailing bareword
      ['{% a=1 b %}'],
      ['{% width="30%" b %}'],
      // bareword value (Markdoc has no unquoted values)
      ['{% a=b %}'],
      // spaces around `=`
      ['{% width = "30%" %}'],
      ['{% a= 1 %}'],
      // a stray value where the next item must be an attribute or shortcut
      ['{% a=1 $foo %}'],
      ['{% a=1 "str" %}'],
      // only a tag-open may carry the self-close marker
      ['{% a="x" /%}'],
    ])('%s stays malformed (upstream rejects it)', (span) => {
      const parsed = parseMarkdocSpan(span);
      expect(parsed.kind).toBe('malformed');
      expect(parsed.reason).toBeTruthy();
    });

    it.each([
      ['{% t a=1 %}', 'tag-open'],
      ['{% t %}', 'tag-open'],
      ['{% if $flag %}', 'tag-open'],
      ['{% t .a %}', 'tag-open'],
      ['{% partial file="x.md" /%}', 'tag-self-closing'],
      ['{% /t %}', 'tag-close'],
      ['{% $foo %}', 'variable'],
      ['{% fn(1) %}', 'function'],
    ])('%s is untouched by the new branch (still %s)', (span, kind) => {
      expect(parseMarkdocSpan(span).kind).toBe(kind);
    });

    it('a named tag with a primary keeps its primary', () => {
      const parsed = parseMarkdocSpan('{% if $flag %}');
      expect(parsed).toMatchObject({ kind: 'tag-open', name: 'if' });
      expect(parsed.primary).toMatchObject({ valueKind: 'variable' });
    });

    // Span texts from the Redocly docs that used to be reported as malformed.
    it('every corpus false-positive span text now classifies annotation', () => {
      const corpus = [
        '{% align="right" %}',
        '{% width="30%" %}',
        '{% width="90px" %}',
        '{% width="35%" %}',
        '{% width="20%" %}',
        '{% width="80%" %}',
        '{% width="40%" %}',
        '{% width="15%" %}',
        '{% class="highlight" %}',
        '{% colspan=3 align="center" %}',
        '{% colspan=2 align="center" %}',
      ];
      for (const text of corpus) {
        expect(parseMarkdocSpan(text).kind).toBe('annotation');
      }
    });
  });
});
