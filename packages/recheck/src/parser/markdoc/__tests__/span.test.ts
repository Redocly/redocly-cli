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
  // Real Markdoc has no bare-identifier value at all and rejects this
  // outright. Recheck still captures it, as a distinct `bareword` kind, so a
  // rule can point at the offending attribute instead of the whole tag
  // collapsing to `malformed`.
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
  // Markdoc's identifier syntax is `[a-zA-Z0-9_-]+` with no separate "start"
  // character class, so digit-leading (and dash-leading) names are legal
  // upstream for both tag names and attribute names.
  it('a digit-leading tag name parses as tag-open', () => {
    const s = parseMarkdocSpan('{% 1x foo="bar" %}');
    expect(s).toMatchObject({ kind: 'tag-open', name: '1x' });
    expect(s.attributes[0]).toMatchObject({ name: 'foo', valueKind: 'string', value: 'bar' });
  });
  // ...but only in a slot where the grammar does not try a value first. The
  // slot right after the tag name does, which splits a digit-leading name
  // there instead of reading it whole -- see 'first-slot Value greed' below.
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

    // Markdoc's number syntax has no exponent alternative, so its scanner
    // stops `2e3` after the `2` and then fails on the leftover `e3`. Recheck
    // stops in the same place, leaving `e3` sitting where an
    // `identifier=value` pair must start.
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

  // Markdoc's grammar has a positional value slot immediately after the tag
  // name, tried before attributes -- that is how `{% if $flag %}` works.
  // Upstream assigns it to the schema attribute literally named `primary`.
  describe('primary value', () => {
    // Each test pins its own slice offsets rather than one loop over all the
    // cases: a loop would have to branch on `valueKind` to know whether the
    // slice equals `value` (raw kinds) or is merely non-empty (decoded
    // kinds), and a conditional expect is its own anti-pattern.
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
    // Upstream rejects a bare word in primary position too. Recheck captures
    // it, as it does a bareword attribute value, so a rule can flag the value
    // instead of the whole tag.
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
      // `type` matches no value alternative, so the slot after the tag name
      // falls through to the attribute list -- which is what keeps ordinary
      // `{% admonition type="info" %}` tags out of the primary slot.
      const s = parseMarkdocSpan('{% admonition type="info" %}');
      expect(s.primary).toBeUndefined();
      expect(s.attributes).toEqual([
        expect.objectContaining({ name: 'type', valueKind: 'string', value: 'info' }),
      ]);
    });

    // Markdoc tries a plain value in the slot right after the tag name before
    // it tries the attribute list, with no lookahead for a following `=`. Its
    // number scanner then consumes the digit run greedily, so the first slot
    // SPLITS a digit-leading name: upstream reads `{% icon 1x="star" %}` as
    // primary `1` plus attribute `x="star"`. When the split leaves text that
    // cannot start an `identifier=value` pair, the whole span is a parse
    // error upstream and `malformed` here.
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

      // `-` is both an identifier character and the number sign, and a value
      // is tried first, so a signed digit run wins the slot.
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

      // A `null`/`true`/`false` literal is a value, so it wins the first slot
      // too and the `=` after it has nothing left to attach to.
      it('a keyword literal wins the first slot, so "null=1" there is malformed', () => {
        expect(parseMarkdocSpan('{% t null=1 %}').kind).toBe('malformed');
        expect(parseMarkdocSpan('{% t true=1 %}').kind).toBe('malformed');
      });

      // A later slot has no value attempt in front of it, so a bare
      // identifier there is a missing-`=` error rather than a bareword.
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

    // Upstream allows a SINGLE optional whitespace character between the
    // primary and the attribute list, where every other gap in the grammar is
    // zero-or-more. So one space, one tab, or one newline is fine there, but
    // two spaces -- or a newline plus indentation -- is a parse error, while
    // gaps elsewhere stay unrestricted.
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

      // Recheck deliberately does not normalize line endings, so span text can
      // still contain a literal CRLF. Upstream collapses every line ending to
      // a single `\n` before the grammar sees the text, so a CRLF pair is
      // exactly ONE whitespace unit here and two in a row are two.
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

      // Form feed and vertical tab are not in Markdoc's whitespace class at
      // all, so upstream rejects these outright. The malformed reason here
      // comes from the ordinary attribute scan rather than the
      // one-whitespace-unit gate, which is why these assert its message is
      // absent.
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

  // Upstream puts no whitespace rule on either side of an attribute's `=`, so
  // every spaced spelling is a parse error there. Whitespace only ever
  // separates one attribute from the NEXT, never a name from its own value.
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

    // A name with no `=` at all is a different diagnostic, nothing to do with
    // spacing, so it keeps the plain message.
    it('a name with no "=" at all reports the plain missing-"=" reason', () => {
      const s = parseMarkdocSpan('{% t a %}');
      expect(s.primary).toMatchObject({ valueKind: 'bareword', value: 'a' });
      const missing = parseMarkdocSpan('{% t a=1 b %}');
      expect(missing.kind).toBe('malformed');
      expect(missing.reason).not.toContain('no spaces');
    });
  });

  // Shortcuts never enter `attributes[]`; they live in their own `shortcuts`
  // array, in source order.
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

    // Upstream requires at least one whitespace unit between items after the
    // first, so it rejects both adjacencies even though each shortcut is
    // individually well-formed.
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

    // The number scanner consumes only ONE fraction (`1.5`), leaving `.5` for
    // the attribute list, where it reads as a class shortcut. Number greed
    // wins because primary-value scanning always runs first.
    it('a decimal primary followed immediately by a numeric class name (number greed)', () => {
      const text = '{% t 1.5.5 %}';
      const s = parseMarkdocSpan(text);
      expect(s.kind).toBe('tag-open');
      expect(s.primary).toMatchObject({ valueKind: 'number', value: 1.5 });
      expect(s.shortcuts).toEqual([{ kind: 'class', name: '5', start: 8, end: 10 }]);
    });

    // Identifier syntax is uniform, so digit-leading shortcut names are as
    // legal upstream as digit-leading tag and attribute names.
    it('a digit-leading class name', () => {
      const s = parseMarkdocSpan('{% t .1x %}');
      expect(s.shortcuts).toEqual([{ kind: 'class', name: '1x', start: 5, end: 8 }]);
    });

    it('a digit-leading id name', () => {
      const s = parseMarkdocSpan('{% t #1x %}');
      expect(s.shortcuts).toEqual([{ kind: 'id', name: '1x', start: 5, end: 8 }]);
    });

    // Both shortcut forms require an identifier after the sigil, so a bare
    // sigil is a parse error upstream too.
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

    // Upstream's close tag has no attribute list at all. Recheck does parse a
    // trailing attribute list there -- a separate, pre-existing divergence --
    // but never recognizes shortcuts in that position, so this stays
    // malformed.
    it('a close tag with a shortcut stays malformed (close-tag behavior unchanged)', () => {
      const s = parseMarkdocSpan('{% /t .a %}');
      expect(s.kind).toBe('malformed');
    });

    // No value alternative starts with a shortcut sigil, and unlike a
    // bareword there is no fallback shape to capture, so the whole span stays
    // malformed rather than becoming diagnosable.
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

    // The one-whitespace-unit gate after a primary applies identically when
    // the first item following it is a shortcut rather than a named attribute.
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

    // The tag name's own trailing gap is zero-or-more, so a shortcut may
    // follow the name with no whitespace at all.
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

    // A number value ends right where the sigil begins, but upstream still
    // requires the separator there, same as shortcut-to-shortcut adjacency.
    it('an attribute value directly followed by a shortcut with no whitespace is malformed', () => {
      const s = parseMarkdocSpan('{% t b=1.a %}');
      expect(s.kind).toBe('malformed');
      expect(s.reason).toBeTruthy();
    });

    // The shortcut's identifier scan consumes the whole name, so the `=1`
    // tail falls through to the attribute-name scan and fails on the `=`
    // there, matching upstream.
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

  // A variable's tail is a chain of `.identifier` segments and `[index]`
  // brackets, where the index may only be a number or a quoted string --
  // which is what makes the bracket rejections below expected.
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

    // Real span texts taken from this repo's docs, which this parser used to
    // flag.
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

    // A bracket index must be exactly a number or a quoted string, and no
    // whitespace is allowed anywhere in the tail.
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

    // Upstream shares one tail syntax between top-level and value position, so
    // bracket indices work inside an attribute value too.
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

  // Upstream treats `$` and `@` as two prefixes of the same variable syntax,
  // so `@foo` classifies as `variable` exactly like `$foo`, tail included.
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

    // A shared pre-dispatch scan strips a trailing self-close marker before
    // the first character is examined, so it is silently ignored here -- the
    // same known divergence as `{% $foo/%}`. Upstream rejects both.
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

  // A bare function call is its own top-level form upstream, alongside a
  // variable -- not a tag whose name happens to be followed by a `(`.
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

    // Real span texts taken from this repo's docs, which this parser used to
    // flag.
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

    // The `(` must come immediately after the identifier, so a space makes
    // this fall through to a named-tag reading (tag `fn` with a stray `(1)`
    // where an attribute list would go), which fails on its own.
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

    // Upstream allows no trailing comma in an argument list, unlike in an
    // array or object. Recheck only balances and slices a function interior as
    // opaque text, so it parses here -- a known divergence.
    it('a trailing comma in the argument list is accepted here (ledgered divergence)', () => {
      expect(parseMarkdocSpan('{% fn(1,) %}').kind).toBe('function');
    });

    // The same shared pre-dispatch scan strips the trailing self-close marker
    // before dispatch, so it is ignored here exactly as it is for a variable.
    // Upstream rejects it.
    it('a trailing self-close marker is ignored, unlike upstream (ledgered divergence)', () => {
      expect(parseMarkdocSpan('{% fn(1)/%}').kind).toBe('function');
    });
  });

  // Upstream tries the annotation form -- a bare attribute list with no
  // leading tag name -- before the tag-open one, so a body that is nothing but
  // attributes and shortcuts is an annotation, not a tag whose name happens to
  // be followed by `=`.
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
      // A digit-leading attribute name is as legal here as for a tag name.
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

    // An annotation body is left unparsed by design, so nothing downstream
    // would report a problem inside it. Every case here is a parse error
    // upstream and must stay `malformed` rather than be laundered into a
    // silent annotation.
    it.each([
      // trailing bareword
      ['{% a=1 b %}'],
      ['{% width="30%" b %}'],
      // bareword value -- upstream has no unquoted-identifier value
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

    // Every distinct span text in this repo's docs that was previously
    // reported as a false-positive `malformed`.
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
