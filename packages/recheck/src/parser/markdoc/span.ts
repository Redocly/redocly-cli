// Pure, micromark-free parser for the interior of a single Markdoc
// `{% ... %}` span: kind, name, attributes, and 0-based offsets into the span
// text it was given. The tokenizer only locates span BOUNDARIES; all interior
// structure comes from this single-pass scanner, which depends on no
// document-level state and so is testable on plain strings.
//
// Invariant: never throws. A linter's primary input is broken documents, so
// anything unparseable comes back as `kind: 'malformed'` with a
// human-readable `reason`; callers always get a `ParsedMarkdocSpan`.
//
// Ground truth is the Markdoc RENDERER, not `tag.pegjs`'s raw grammar. The
// renderer collapses every line ending to a single `\n` before the grammar's
// whitespace rule runs, so a `\r\n` pair (or a lone `\r`) counts as ONE
// whitespace unit here -- see `scanMarkdocSpaceUnit`.
//
// Deliberate divergences from upstream Markdoc follow. Unless noted, each is
// a leniency: we accept what upstream rejects as a parse error.
//
// - Barewords: an unquoted identifier in a value slot (`{% t name=star %}`,
//   `{% if maybe %}`) gets its own `'bareword'` kind and offsets so a rule can
//   point at it, instead of collapsing the whole span to `malformed`.
// - Annotation bodies are never parsed -- `kind: 'annotation'`, no
//   `attributes`, no `shortcuts` -- an extension point for the LSP phase. So
//   sigil-first bodies upstream rejects still classify as annotations here:
//   `{% .a.b %}`, `{% . %}`, `{% .a junk %}`, `{% #a=1 %}`. (Shortcuts inside
//   a NAMED tag are a different matter: those are fully parsed into
//   `shortcuts` -- see `MarkdocShortcut`.)
// - The attribute-first annotation form (`{% width="30%" %}`) does scan its
//   body, so rather than adding a divergence it inherits the ones below:
//   `{% a=1b=2 %}`, `{% a=1\fb=2 %}`, `{% a=fn(1,) %}`, `{% a="a\qb" %}` all
//   classify as annotations. Genuinely broken bodies still land `malformed`
//   (`{% a=b %}`, `{% a=1 b %}`, `{% width = "30%" %}`, `{% a="x" /%}`).
// - Glued attributes: `{% t a=1b=2 %}` parses as two attributes. The
//   separator guard in `scanAttributes` gates only its shortcut branch, not
//   the plain attribute-name scan.
// - `\f`/`\v` pass as an item separator, for attributes and shortcuts alike
//   since both ride the same `scanAttributes` loop: `{% t a=1\fb=2 %}`,
//   `{% t .a\f.b %}`. The one exception is the primary-to-first-attribute gap,
//   which uses the strict `isMarkdocSpace`.
// - Lenient strings: `scanString` validates nothing between the quotes beyond
//   finding the closing `"`, so it accepts any `\<char>` escape
//   (`{% a="a\qb" %}`) and a raw, unescaped newline inside the quotes. Shared
//   by attribute values, array/object interiors, and a variable's bracket tail
//   (`{% $foo["a\qb"] %}`).
// - Array, object, and function interiors are only balanced and sliced, never
//   validated. Upstream's `Function` production is the strict one, so
//   `{% fn(1,) %}`, `{% fn(1 ) %}`, and the multiline `{% fn(\n 1,\n 2\n) %}`
//   parse here but error upstream; the equivalent array forms
//   (`{% t x=[1,] %}`) are upstream-valid anyway.
// - `{%- -%}` trim markers are stripped and ignored; `tag.pegjs` has no such
//   syntax.
// - A self-close marker on a top-level value parses as a plain
//   `variable`/`function`: `{% $foo/%}`, `{% @foo.bar/%}`, `{% $foo["a"]/%}`,
//   `{% equals(1,1)/%}`. The shared pre-dispatch scan strips the marker before
//   the first character is examined.
// - Close tags may carry a parsed attribute list, though `TagClose` upstream
//   is just `'/' tag:TagName`.
// - Duplicate attributes are never flagged. `{% t a=1 a=2 %}`, `{% t #a #b %}`,
//   `{% t #a id="b" %}`, and `{% t .a class="b" %}` are all upstream
//   `duplicate-attribute` warnings; detecting them needs the schema-level
//   `class`/`id` view with shortcuts folded in, which only a schema-aware rule
//   has. Note two shortcuts naming the same class (`{% t .a .a %}`) is clean
//   upstream too -- they merge into one `class` entry.
// - Keyword literals are the one SHAPE-only divergence: `null`/`true`/`false`
//   match boundary-free upstream but as maximal identifiers here, so
//   accept/reject agrees while the parse differs on keyword-prefixed names.
//   Upstream reads `{% t nullable=true %}` as attribute `{able: true}` and
//   `{% t truey=1 %}` as primary `true` plus `{y: 1}`; this keeps the whole
//   identifier (`nullable`/`truey`). In value position it becomes a bareword.

export type MarkdocTagKind =
  | 'tag-open'
  | 'tag-close'
  | 'tag-self-closing'
  | 'annotation'
  | 'variable'
  | 'function';
export type MarkdocValueKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'array'
  | 'object'
  | 'variable'
  | 'function'
  | 'bareword';

export interface MarkdocAttribute {
  name: string;
  valueKind: MarkdocValueKind;
  /** Literal value for string/number/boolean/null; raw source text otherwise. */
  value: string | number | boolean | null;
  /** 0-based offsets into the SPAN text, for child-token synthesis. */
  nameStart: number;
  nameEnd: number;
  valueStart: number;
  valueEnd: number;
}

/**
 * A class (`.foo`) or id (`#bar`) shortcut inside a named tag's attribute list.
 * Markdoc folds these into `class`/`id` attributes on the AST node; this parser
 * keeps them in their own list instead, because a shortcut has no `name=value`
 * source text and a pseudo attribute entry would carry lying offsets. Folding
 * them into `class`/`id` is a schema-aware concern, not this parser's.
 */
export interface MarkdocShortcut {
  kind: 'class' | 'id';
  name: string; // without the '.'/'#' sigil
  start: number; // 0-based span offset of the sigil character
  end: number; // exclusive end of the name; text.slice(start, end) includes the sigil
}

export interface ParsedMarkdocSpan {
  kind: MarkdocTagKind | 'malformed';
  name: string | null; // null for annotation/variable/function/malformed
  attributes: MarkdocAttribute[];
  nameStart: number;
  nameEnd: number; // 0-based span offsets; 0,0 when name null
  /** Markdoc's positional value slot right after the tag name ({% if $flag %}).
   * Real Markdoc assigns it to the schema attribute literally named `primary`. */
  primary?: {
    valueKind: MarkdocValueKind;
    value: string | number | boolean | null; // decoded for string/number/boolean/null; raw source otherwise
    valueStart: number; // 0-based offsets into the SPAN text, slice contract as for attributes
    valueEnd: number;
  };
  /**
   * Class/id shortcuts from a NAMED tag's attribute list, in source order.
   * Absent (not an empty array) when none were found.
   */
  shortcuts?: MarkdocShortcut[];
  reason?: string; // malformed only: human-readable cause
  /**
   * `malformed` only, and only when the scanner knew where it gave up: the
   * 0-based span offset of the offending character. Kept as a number rather
   * than baked into `reason` so a consumer can translate it into an absolute
   * document position. Absent for causes with no single meaningful position,
   * such as an empty body or a missing delimiter.
   */
  reasonOffset?: number;
}

function isSpace(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';
}

// Markdoc's own grammar whitespace class: exactly space/tab/newline, narrower
// than `isSpace` above. Used for the primary-to-first-attribute gap, where the
// grammar allows at most one whitespace character.
function isMarkdocSpace(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n';
}

/**
 * Consumes ONE Markdoc whitespace unit starting at `pos`. Markdoc's grammar
 * runs after the renderer has collapsed every line ending to a single '\n', so
 * a '\r\n' pair or a lone '\r' each count as one unit here despite spanning two
 * raw characters. Recheck deliberately does not normalize span text (see
 * `core/line-endings.ts`), hence the collapse by hand.
 *
 * Returns `pos` unchanged if no unit starts there -- notably for '\f'/'\v',
 * which are outside Markdoc's whitespace class and must not be consumed here.
 */
function scanMarkdocSpaceUnit(text: string, pos: number, end: number): number {
  if (pos >= end) return pos;
  const ch = text[pos];
  if (isMarkdocSpace(ch)) return pos + 1;
  if (ch === '\r') return pos + 1 < end && text[pos + 1] === '\n' ? pos + 2 : pos + 1;
  return pos;
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

function isAlpha(ch: string | undefined): boolean {
  return ch !== undefined && ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z'));
}

// Markdoc's `Identifier` is a single uniform `[a-zA-Z0-9_-]+` class with no
// distinct "start" rule, so digit-leading (`1x`) and dash-leading (`-x`) names
// are legal for tags and attributes alike. Hence this accepts exactly the same
// characters as `isIdentChar`.
function isIdentStart(ch: string | undefined): boolean {
  return isAlpha(ch) || isDigit(ch) || ch === '_' || ch === '-';
}

function isIdentChar(ch: string | undefined): boolean {
  return isAlpha(ch) || isDigit(ch) || ch === '_' || ch === '-';
}

/** Scans `[A-Za-z0-9_-]+` starting at `pos`. Returns `pos` unchanged if no identifier starts there. */
function scanIdentifier(text: string, pos: number, end: number): number {
  let p = pos;
  if (p < end && isIdentStart(text[p])) {
    p++;
    while (p < end && isIdentChar(text[p])) p++;
  }
  return p;
}

/**
 * Scans a bracketed run (`[...]`, `{...}`, or `(...)`) starting at `pos`,
 * skipping quoted string contents so brackets inside strings
 * (`{title: "a]b"}`) don't miscount. Only the outer pair's own characters need
 * counting: a mismatched nested pair can't affect when the outer bracket
 * closes, and nested same-type pairs still balance correctly.
 *
 * Returns the position just past the matching close bracket, or -1 if the text
 * ends before the brackets balance.
 */
function scanBalanced(text: string, pos: number, end: number, open: string, close: string): number {
  let depth = 0;
  let p = pos;
  while (p < end) {
    const ch = text[p];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      p++;
      while (p < end && text[p] !== quote) {
        p += text[p] === '\\' && p + 1 < end ? 2 : 1;
      }
      if (p >= end) return -1; // unterminated string inside the bracketed value
      p++; // consume the closing quote
      continue;
    }
    if (ch === open) {
      depth++;
      p++;
      continue;
    }
    if (ch === close) {
      depth--;
      p++;
      if (depth === 0) return p;
      continue;
    }
    p++;
  }
  return -1; // never balanced
}

interface ScannedValue {
  kind: MarkdocValueKind;
  value: string | number | boolean | null;
  endPos: number;
}

/** Scans a double-quoted string starting at `text[pos] === '"'`, decoding `\"` and `\\` escapes. */
function scanString(text: string, pos: number, end: number): ScannedValue | null {
  let p = pos + 1;
  let decoded = '';
  while (p < end) {
    const ch = text[p];
    if (ch === '"') {
      return { kind: 'string', value: decoded, endPos: p + 1 };
    }
    if (ch === '\\' && p + 1 < end) {
      const next = text[p + 1];
      decoded += next === '"' || next === '\\' ? next : `\\${next}`;
      p += 2;
      continue;
    }
    decoded += ch;
    p++;
  }
  return null; // unterminated string
}

/**
 * Scans Markdoc's `ValueNumber`, `'-'? [0-9]+ ('.'[0-9]+)?`. Notably NOT a
 * JSON/JavaScript number: the grammar has no exponent alternative, so the `e`
 * in `2e3` is not part of the number and `{% img scale=2e3 %}` is an upstream
 * parse error. Matching that greed exactly is what makes leftover text land in
 * the next slot the way it does upstream.
 *
 * Caller has already confirmed a digit (or `-` + digit) at `pos`.
 */
function scanNumber(text: string, pos: number, end: number): ScannedValue {
  let p = pos;
  if (text[p] === '-') p++;
  while (p < end && isDigit(text[p])) p++;
  if (text[p] === '.' && isDigit(text[p + 1])) {
    p++;
    while (p < end && isDigit(text[p])) p++;
  }
  return { kind: 'number', value: Number(text.slice(pos, p)), endPos: p };
}

/**
 * Scans zero or more Markdoc `VariableTail` segments starting at `pos`:
 * `'.' Identifier` or `'[' (ValueNumber | ValueString) ']'`. Shared by a
 * `$`/`@` variable's value position and its top-level position, because
 * upstream reuses the one production for both.
 *
 * Neither alternative allows any whitespace -- not around the `.`, not inside
 * the brackets -- and a bracket's contents must be exactly a number or a
 * string, never a bare identifier or an expression. So `$foo[bar]`,
 * `$foo[ 0 ]`, and `$foo[]` are upstream errors while `$foo[0]`, `$foo["bar"]`,
 * and chains like `$foo.bar["x"].baz` are fine.
 *
 * A segment that fails to match consumes nothing, leaving `pos` at the start of
 * the offending segment so the caller's trailing-content check rejects it. That
 * is how a trailing dot (`$foo.`) or doubled dot (`$foo..bar`) is caught.
 *
 * Returns `pos` unchanged if no tail segment starts there.
 */
function scanVariableTail(text: string, pos: number, end: number): number {
  let p = pos;
  for (;;) {
    if (text[p] === '.') {
      const segEnd = scanIdentifier(text, p + 1, end);
      if (segEnd === p + 1) break;
      p = segEnd;
      continue;
    }
    if (text[p] === '[') {
      const bracketValueStart = p + 1;
      let valueEnd: number;
      if (text[bracketValueStart] === '"') {
        const str = scanString(text, bracketValueStart, end);
        if (!str) break; // unterminated string inside the brackets
        valueEnd = str.endPos;
      } else if (
        isDigit(text[bracketValueStart]) ||
        (text[bracketValueStart] === '-' && isDigit(text[bracketValueStart + 1]))
      ) {
        valueEnd = scanNumber(text, bracketValueStart, end).endPos;
      } else {
        break; // bracket contents are neither a ValueNumber nor a ValueString
      }
      if (text[valueEnd] !== ']') break;
      p = valueEnd + 1;
      continue;
    }
    break;
  }
  return p;
}

/**
 * Scans one value at `pos`, recognizing exactly Markdoc's `Value` production
 * and nothing more: quoted string, number, `true`/`false`/`null`, `$`/`@`
 * variable[.path], `identifier(...)` function call, balanced `[...]` array, or
 * balanced `{...}` object. A bare unquoted identifier (the `star` in
 * `name=star`) is deliberately NOT recognized here, since `Value` has no such
 * alternative upstream -- see `scanBareword`.
 *
 * Returns `null` if no `Value` starts at `pos`.
 */
function scanValue(text: string, pos: number, end: number): ScannedValue | null {
  const ch = text[pos];
  if (ch === '"') return scanString(text, pos, end);

  // `$` and `@` are two prefixes of the same upstream `Variable` production, so
  // a value in attribute or primary position accepts either (`{% t x=@foo /%}`).
  if (ch === '$' || ch === '@') {
    const identEnd = scanIdentifier(text, pos + 1, end);
    if (identEnd === pos + 1) return null; // '$'/'@' not followed by an identifier
    const p = scanVariableTail(text, identEnd, end);
    return { kind: 'variable', value: text.slice(pos, p), endPos: p };
  }

  if (isDigit(ch) || (ch === '-' && isDigit(text[pos + 1]))) {
    return scanNumber(text, pos, end);
  }

  if (ch === '[') {
    const closeEnd = scanBalanced(text, pos, end, '[', ']');
    return closeEnd === -1
      ? null
      : { kind: 'array', value: text.slice(pos, closeEnd), endPos: closeEnd };
  }

  if (ch === '{') {
    const closeEnd = scanBalanced(text, pos, end, '{', '}');
    return closeEnd === -1
      ? null
      : { kind: 'object', value: text.slice(pos, closeEnd), endPos: closeEnd };
  }

  if (isIdentStart(ch)) {
    const identEnd = scanIdentifier(text, pos, end);
    const word = text.slice(pos, identEnd);
    if (word === 'true') return { kind: 'boolean', value: true, endPos: identEnd };
    if (word === 'false') return { kind: 'boolean', value: false, endPos: identEnd };
    if (word === 'null') return { kind: 'null', value: null, endPos: identEnd };
    if (text[identEnd] === '(') {
      const closeEnd = scanBalanced(text, identEnd, end, '(', ')');
      return closeEnd === -1
        ? null
        : { kind: 'function', value: text.slice(pos, closeEnd), endPos: closeEnd };
    }
  }

  return null;
}

/**
 * A bare unquoted identifier in a value slot (`name=star`, `{% if maybe %}`).
 * Markdoc rejects these outright; recognizing the shape anyway -- instead of
 * collapsing the whole span to `malformed` -- is what lets a rule point at the
 * offending value and say "quote it".
 *
 * The identifier scanned is the maximal `[A-Za-z0-9_-]+` run, so a
 * keyword-prefixed word like `nullx` is one bareword here where upstream
 * prefix-matches `null` and then fails on the leftover. Either way the span is
 * one Markdoc rejects, and the bareword reading is the actionable one.
 */
function scanBareword(text: string, pos: number, end: number): ScannedValue | null {
  const identEnd = scanIdentifier(text, pos, end);
  if (identEnd === pos) return null;
  return { kind: 'bareword', value: text.slice(pos, identEnd), endPos: identEnd };
}

/**
 * Detects Markdoc's positional value slot right after the tag name
 * (`{% if $flag %}`, `{% image "a.png" /%}`). Upstream attempts a plain `Value`
 * there BEFORE the attribute list and with no lookahead for a following `=`:
 * whatever `Value` matches, it takes, and the attribute list starts at the
 * leftover text. That greed shows wherever a `Value` is a strict prefix of an
 * identifier:
 *
 *   `{% icon 1x="star" %}` -> primary number `1`, then attribute `x="star"`
 *   `{% t 123="x" %}`      -> primary number `123`, then `="x"` is a parse error
 *   `{% t null=1 %}`       -> primary `null`, then `=1` is a parse error
 *
 * so a digit run must be consumed as a number here, not as the head of a `1x=`
 * attribute name. An identifier in a non-first slot has no `Value` attempt in
 * front of it, which is why `1bar="b"` is a legal attribute in
 * `{% x foo="a" 1bar="b" %}`.
 *
 * When `Value` matches nothing the slot holds a bare identifier, which Markdoc
 * rejects either way, so we pick the reading a rule can act on: an identifier
 * followed by `=` is reported as the first ATTRIBUTE's name -- including across
 * whitespace, so `{% t a = 1 %}` is diagnosed as the `=`-spacing error it is
 * rather than a bareword primary trailed by junk. Any other identifier becomes
 * a bareword primary.
 *
 * Returns `null` if nothing recognizable starts at `pos`.
 */
function scanPrimaryValue(text: string, pos: number, end: number): ScannedValue | null {
  const value = scanValue(text, pos, end);
  if (value) return value;

  const bareword = scanBareword(text, pos, end);
  if (!bareword) return null;
  let p = bareword.endPos;
  while (p < end && isSpace(text[p])) p++;
  if (p < end && text[p] === '=') return null; // "name=..." starts attributes
  return bareword;
}

interface AttributeScanResult {
  pos: number;
  error: string | null;
  attributes: MarkdocAttribute[];
  shortcuts: MarkdocShortcut[];
}

const NO_SPACES_AROUND_EQUALS = "Markdoc allows no spaces around an attribute's '='";

/**
 * Scans `identifier=value` pairs and (when `allowShortcuts`) `.class`/`#id`
 * shortcuts, whitespace-separated, from `startPos` to `end`. Stops successfully
 * at `end`, or reports the first syntax error it finds.
 *
 * Markdoc puts no whitespace rule on either side of an attribute's `=`, so
 * `a = 1`, `a= 1`, and `a =1` are all parse errors and `a=1` is the only
 * accepted spelling. Whitespace separates one attribute from the next, never a
 * name from its own value.
 *
 * `leadingIsSpace` governs only the FIRST whitespace skip (the gap before the
 * first item this call sees); later gaps always use the lax `isSpace`. The
 * primary-value caller passes the strict `isMarkdocSpace` because it has
 * already consumed the one grammar-legal whitespace unit into `startPos`, so
 * this skip should find nothing and must not swallow a stray '\f'/'\v'.
 *
 * `allowShortcuts` is `false` for close tags and `true` for named
 * tag-open/self-closing spans, where upstream puts shortcuts and named
 * attributes in the same item slot. `sawItem` tracks whether this call has
 * produced an item yet: the first item may follow zero separating whitespace
 * (the caller has already arranged that before `startPos`), but a SHORTCUT
 * after the first item requires at least one whitespace unit. When that
 * separator is missing, the loop deliberately skips the shortcut branch and
 * falls through to the attribute-name scan, which fails on the sigil and so
 * reproduces upstream's rejection of `{% t .a.b %}`, `{% t .a#b %}`, and
 * `{% t b=1.a %}` for free. The guard covers only shortcuts -- glued named
 * attributes still both parse (see the header ledger).
 */
function scanAttributes(
  text: string,
  startPos: number,
  end: number,
  leadingIsSpace: (ch: string | undefined) => boolean = isSpace,
  allowShortcuts = false
): AttributeScanResult {
  const attributes: MarkdocAttribute[] = [];
  const shortcuts: MarkdocShortcut[] = [];
  let pos = startPos;
  let isSpaceHere = leadingIsSpace;
  let sawItem = false;
  for (;;) {
    const beforeSkip = pos;
    while (pos < end && isSpaceHere(text[pos])) pos++;
    const skippedSeparator = pos > beforeSkip;
    isSpaceHere = isSpace;
    if (pos >= end) return { pos, error: null, attributes, shortcuts };

    const ch = text[pos];
    if (allowShortcuts && (ch === '.' || ch === '#') && (!sawItem || skippedSeparator)) {
      const sigilStart = pos;
      const shortcutNameStart = pos + 1;
      const shortcutNameEnd = scanIdentifier(text, shortcutNameStart, end);
      if (shortcutNameEnd === shortcutNameStart) {
        return {
          pos,
          error: `expected an identifier after "${ch}"`,
          attributes,
          shortcuts,
        };
      }
      shortcuts.push({
        kind: ch === '.' ? 'class' : 'id',
        name: text.slice(shortcutNameStart, shortcutNameEnd),
        start: sigilStart,
        end: shortcutNameEnd,
      });
      pos = shortcutNameEnd;
      sawItem = true;
      continue;
    }

    const nameStart = pos;
    const nameEnd = scanIdentifier(text, pos, end);
    if (nameEnd === nameStart) {
      return {
        pos,
        error: `expected an attribute name`,
        attributes,
        shortcuts,
      };
    }
    const name = text.slice(nameStart, nameEnd);
    pos = nameEnd;

    if (pos >= end || text[pos] !== '=') {
      return {
        pos,
        error:
          pos < end && isSpace(text[pos])
            ? `expected '=' immediately after attribute name "${name}" (${NO_SPACES_AROUND_EQUALS})`
            : `expected '=' after attribute name "${name}"`,
        attributes,
        shortcuts,
      };
    }
    pos++; // consume '='
    if (pos >= end) {
      return {
        pos,
        error: `expected a value after '=' for attribute "${name}"`,
        attributes,
        shortcuts,
      };
    }
    if (isSpace(text[pos])) {
      return {
        pos,
        error: `expected a value immediately after '=' for attribute "${name}" (${NO_SPACES_AROUND_EQUALS})`,
        attributes,
        shortcuts,
      };
    }

    const valueStart = pos;
    const scanned = scanValue(text, pos, end) ?? scanBareword(text, pos, end);
    if (!scanned) {
      return {
        pos,
        error: `unrecognized attribute value`,
        attributes,
        shortcuts,
      };
    }

    attributes.push({
      name,
      valueKind: scanned.kind,
      value: scanned.value,
      nameStart,
      nameEnd,
      valueStart,
      valueEnd: scanned.endPos,
    });
    pos = scanned.endPos;
    sawItem = true;
  }
}

function malformed(reason: string, reasonOffset?: number): ParsedMarkdocSpan {
  return {
    kind: 'malformed',
    name: null,
    attributes: [],
    nameStart: 0,
    nameEnd: 0,
    reason,
    ...(reasonOffset === undefined ? {} : { reasonOffset }),
  };
}

/**
 * The one shape every annotation classifies to, whichever entry point
 * recognized it: no tag name and a deliberately unparsed body.
 */
function annotation(): ParsedMarkdocSpan {
  return { kind: 'annotation', name: null, attributes: [], nameStart: 0, nameEnd: 0 };
}

/**
 * Parses one Markdoc `{% ... %}` span's text into its kind, name,
 * attributes, and offsets. `spanText` is expected to be exactly the span
 * (e.g. as recognized by the tokenizer) -- offsets in the result are
 * 0-based indexes into this same string. Never throws; unparseable input
 * comes back as `{ kind: 'malformed', reason }`.
 */
export function parseMarkdocSpan(spanText: string): ParsedMarkdocSpan {
  if (!spanText.startsWith('{%')) {
    return malformed("span text does not start with the opening delimiter '{%'");
  }
  if (!spanText.endsWith('%}')) {
    return malformed("span text has no closing '%}' delimiter");
  }

  let start = 2;
  let end = spanText.length - 2;

  // `{%-`/`-%}` whitespace-trim markers. The `end - 1 >= start` guard
  // stops a single `-` sitting exactly between the delimiters (e.g. the
  // degenerate `{%-%}`) from being consumed by both checks.
  if (spanText[start] === '-') start++;
  if (end - 1 >= start && spanText[end - 1] === '-') end--;

  if (start > end) {
    return malformed('span delimiters leave no room for a body');
  }

  // A trailing `/` (before the close delimiter, whitespace-trim markers
  // already stripped) marks a self-closing tag, e.g. `{% partial ... /%}`.
  let bodyEnd = end;
  let selfClosing = false;
  while (bodyEnd > start && isSpace(spanText[bodyEnd - 1])) bodyEnd--;
  if (bodyEnd > start && spanText[bodyEnd - 1] === '/') {
    selfClosing = true;
    bodyEnd--;
    while (bodyEnd > start && isSpace(spanText[bodyEnd - 1])) bodyEnd--;
  }

  let pos = start;
  while (pos < bodyEnd && isSpace(spanText[pos])) pos++;
  if (pos >= bodyEnd) {
    return malformed('span body is empty or contains only whitespace');
  }

  const first = spanText[pos];

  // Close tag: `{% /name %}`.
  if (first === '/') {
    const nameStart = pos + 1;
    const nameEnd = scanIdentifier(spanText, nameStart, bodyEnd);
    if (nameEnd === nameStart) {
      return malformed('close tag is missing a tag name after "/"', nameStart);
    }
    const scanned = scanAttributes(spanText, nameEnd, bodyEnd);
    if (scanned.error) return malformed(scanned.error, scanned.pos);
    if (scanned.pos !== bodyEnd) {
      return malformed('unexpected trailing content in close tag', scanned.pos);
    }
    return {
      kind: 'tag-close',
      name: spanText.slice(nameStart, nameEnd),
      attributes: scanned.attributes,
      nameStart,
      nameEnd,
    };
  }

  // Annotation, sigil-first form: `{% #id .class ... %}`. The name is null (an
  // annotation has no tag name) and the body is left unparsed. The
  // attribute-first form of the same production sits further down, after the
  // variable/function branches, because upstream tries top-level values first.
  if (first === '#' || first === '.') {
    return annotation();
  }

  // Variable interpolation: `{% $name %}` / `{% @name %}`, plus any dotted or
  // bracket-indexed tail (`{% $frontmatter.title %}`, `{% @foo["bar"].baz %}`).
  // `$` and `@` are two prefixes of the same upstream production, not two
  // shapes, so both classify as `'variable'` with identical handling. The tail
  // is not broken out into structured internals -- that is an LSP-phase concern.
  if (first === '$' || first === '@') {
    const identStart = pos + 1;
    const identEnd = scanIdentifier(spanText, identStart, bodyEnd);
    if (identEnd === identStart) {
      return malformed(`variable interpolation is missing a name after "${first}"`, identStart);
    }
    let p = scanVariableTail(spanText, identEnd, bodyEnd);
    while (p < bodyEnd && isSpace(spanText[p])) p++;
    if (p !== bodyEnd) {
      return malformed('unexpected trailing content after variable interpolation', p);
    }
    return { kind: 'variable', name: null, attributes: [], nameStart: 0, nameEnd: 0 };
  }

  // Bare top-level function call: `{% equals(1,1) %}`, the other half of the
  // same upstream production as the variable branch above. The `(` must be
  // glued to the identifier: `{% fn (1) %}` is an upstream error, and here it
  // falls through to the tag-name branch below, which fails on the stray `(`
  // naturally. Once the glued shape IS seen, upstream commits to a function
  // with no fallback to a tag-name reading (`{% fn(1) junk %}` and
  // `{% fn(1)/%}` are both errors there), so this must short-circuit ahead of
  // that branch. Interiors stay opaque, matching function values elsewhere.
  if (isIdentStart(first)) {
    const funcNameEnd = scanIdentifier(spanText, pos, bodyEnd);
    if (spanText[funcNameEnd] === '(') {
      const closeEnd = scanBalanced(spanText, funcNameEnd, bodyEnd, '(', ')');
      if (closeEnd === -1) {
        return malformed('unterminated function call parentheses', funcNameEnd);
      }
      let p = closeEnd;
      while (p < bodyEnd && isSpace(spanText[p])) p++;
      if (p !== bodyEnd) {
        return malformed('unexpected trailing content after function interpolation', p);
      }
      return { kind: 'function', name: null, attributes: [], nameStart: 0, nameEnd: 0 };
    }
  }

  // Annotation, attribute-first form: `{% width="30%" %}`,
  // `{% colspan=2 align="center" %}`, `{% class="x" #id .cls %}`. Upstream
  // tries its annotation production -- a bare attribute list with no leading
  // tag name -- BEFORE tag-open, so a body that is nothing but attributes and
  // shortcuts is a valid annotation there, never a tag whose name happens to be
  // followed by `=`. This branch's position between the variable/function
  // branches and the tag-name branch reproduces that ordering.
  //
  // Because an annotation body is unparsed by design, nothing downstream would
  // report a problem inside one. Three conditions therefore narrow the branch
  // to genuinely upstream-valid bodies so it can never launder a real error
  // into a silent `annotation`:
  // - The whole body must be consumed with no scan error. A trailing bareword
  //   (`{% a=1 b %}`), a stray value (`{% a=1 "str" %}`), or a spaced `=`
  //   (`{% width = "30%" %}`) falls through to the tag-name reading and lands
  //   `malformed`, as upstream also rejects all three.
  // - No bareword values. An attribute's value must be a real `Value` upstream,
  //   so `{% a=b %}` is an error there. The bareword leniency exists to give a
  //   better diagnostic inside an otherwise well-formed named tag; here it
  //   would only hide an error, so the probe rejects it.
  // - Not self-closing. Only tag-open has a self-close alternative upstream, so
  //   `{% a="x" /%}` must stay `malformed`. The sigil-first branch above has no
  //   such gate -- `{% .foo /%}` still classifies as an annotation -- which is
  //   the pre-existing leniency of its unparsed body, left as-is.
  //
  // `isIdentStart(first)` gates the branch because the sigils are already
  // claimed above, which also makes the first item scanned here necessarily an
  // attribute.
  if (!selfClosing && isIdentStart(first)) {
    const probe = scanAttributes(spanText, pos, bodyEnd, isSpace, true);
    if (
      !probe.error &&
      probe.pos === bodyEnd &&
      !probe.attributes.some((attribute) => attribute.valueKind === 'bareword')
    ) {
      return annotation();
    }
  }

  // Otherwise it must be an open/self-closing tag: `{% name attr=val ... %}`,
  // optionally with a positional primary value right after the name:
  // `{% name primaryValue attr=val ... %}` (e.g. `{% if $flag %}`).
  if (isIdentStart(first)) {
    const nameStart = pos;
    const nameEnd = scanIdentifier(spanText, nameStart, bodyEnd);

    let afterPos = nameEnd;
    while (afterPos < bodyEnd && isSpace(spanText[afterPos])) afterPos++;

    let primary: ParsedMarkdocSpan['primary'];
    let attrStart = nameEnd;
    const primaryScan = scanPrimaryValue(spanText, afterPos, bodyEnd);
    if (primaryScan) {
      primary = {
        valueKind: primaryScan.kind,
        value: primaryScan.value,
        valueStart: afterPos,
        valueEnd: primaryScan.endPos,
      };
      // Exactly one optional whitespace character may separate the primary from
      // the attribute list, where every other gap in the grammar allows any
      // number. So `{% t 1 x="y" %}` parses but `{% t 1  x="y" %}` is an
      // upstream error, as is a primary followed by a newline plus indentation.
      // (`bodyEnd` is already right-trimmed, so leftover whitespace here is
      // always followed by more content, never by the delimiter.)
      attrStart = primaryScan.endPos;
      const afterOneUnit = scanMarkdocSpaceUnit(spanText, attrStart, bodyEnd);
      if (afterOneUnit > attrStart) {
        attrStart = afterOneUnit;
        if (scanMarkdocSpaceUnit(spanText, attrStart, bodyEnd) > attrStart) {
          return malformed(
            "only one whitespace character may separate a tag's primary value from its first attribute",
            attrStart
          );
        }
      }
    }

    // The strict `isMarkdocSpace` (not the lax default) stops a stray '\f'/'\v'
    // right after the primary from being skipped as if it were legal
    // whitespace: `attrStart` has already consumed the one grammar-legal unit,
    // so such a character should fail the attribute-name scan instead.
    const scanned = scanAttributes(
      spanText,
      attrStart,
      bodyEnd,
      primary ? isMarkdocSpace : isSpace,
      true
    );
    if (scanned.error) return malformed(scanned.error, scanned.pos);
    if (scanned.pos !== bodyEnd) {
      return malformed('unexpected trailing content in tag', scanned.pos);
    }
    return {
      kind: selfClosing ? 'tag-self-closing' : 'tag-open',
      name: spanText.slice(nameStart, nameEnd),
      attributes: scanned.attributes,
      nameStart,
      nameEnd,
      ...(primary ? { primary } : {}),
      ...(scanned.shortcuts.length ? { shortcuts: scanned.shortcuts } : {}),
    };
  }

  return malformed(`unexpected character "${first}"`, pos);
}
