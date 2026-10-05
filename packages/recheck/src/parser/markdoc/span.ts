// Parses the inside of one Markdoc `{% ... %}` span: its kind, name, attributes, and
// 0-based offsets into the span text. The tokenizer only finds where a span starts
// and ends.
//
// This never throws. Text that can't be parsed comes back as `kind: 'malformed'`
// with a `reason`.
//
// The reference is the Markdoc renderer, which turns every line ending into a single
// `\n` first. So `\r\n` and a lone `\r` each count as one whitespace character here.
//
// Differences from Markdoc. Unless noted, we accept some things Markdoc rejects.
//
// - Barewords: an unquoted word as a value (`{% t name=star %}`) gets kind
//   `'bareword'`, so a rule can point at it, instead of making the span `malformed`.
// - Annotation bodies that start with `.` or `#` are not parsed (no `attributes` or
//   `shortcuts`), so `{% .a.b %}` and `{% #a=1 %}` count as annotations. Shortcuts in
//   a named tag are parsed into `shortcuts`.
// - An annotation that starts with an attribute (`{% width="30%" %}`) is scanned, and
//   it accepts the same extra forms as named tags, such as `{% a=1b=2 %}`. Invalid
//   ones (`{% a=b %}`, `{% a=1 b %}`, `{% width = "30%" %}`, `{% a="x" /%}`) are malformed.
// - Attributes may be glued together: `{% t a=1b=2 %}` is two attributes.
// - `\f` and `\v` separate attributes and shortcuts. Only the gap between the
//   primary value and the first attribute is strict.
// - Strings accept any `\<char>` escape and raw newlines. Only the closing quote is
//   checked.
// - Array, object and function contents are only checked for balanced brackets, so
//   `{% fn(1,) %}` parses here but not in Markdoc.
// - `{%- -%}` trim markers are accepted and ignored.
// - A top-level variable or function may be followed by `/` (`{% $foo/%}`).
// - Close tags may have attributes.
// - Duplicate attributes (`{% t a=1 a=2 %}`) are not reported. Only a rule that knows
//   the schema can do that.
// - `null`, `true` and `false` are read as whole identifiers. Markdoc reads
//   `{% t nullable=true %}` as the attribute `able`; here it is `nullable`. As a value
//   it becomes a bareword.

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
 * A class (`.foo`) or id (`#bar`) shortcut in a named tag. Markdoc turns these into
 * `class` and `id` attributes. Here they are kept separate because they have no
 * `name=value` text.
 */
export interface MarkdocShortcut {
  kind: 'class' | 'id';
  name: string; // without the '.' or '#'
  start: number; // offset of the '.' or '#'
  end: number; // end of the name (exclusive)
}

export interface ParsedMarkdocSpan {
  kind: MarkdocTagKind | 'malformed';
  name: string | null; // null for annotation, variable, function and malformed
  attributes: MarkdocAttribute[];
  nameStart: number;
  nameEnd: number; // 0 and 0 when `name` is null
  /**
   * The value right after the tag name, as in `{% if $flag %}`. Markdoc assigns it to the attribute
   * named `primary`.
   */
  primary?: {
    valueKind: MarkdocValueKind;
    value: string | number | boolean | null; // decoded for string, number, boolean and null; source text otherwise
    valueStart: number;
    valueEnd: number;
  };
  /** Class and id shortcuts of a named tag, in source order. Missing when there are none. */
  shortcuts?: MarkdocShortcut[];
  reason?: string; // only for malformed
  /** For malformed spans: the offset of the character where parsing failed, if there is one. */
  reasonOffset?: number;
}

function isSpace(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';
}

// Markdoc's own whitespace: only space, tab and newline, narrower than `isSpace`.
function isMarkdocSpace(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n';
}

/**
 * Skips one whitespace unit at `pos`. '\r\n' and a lone '\r' count as one unit.
 * Returns `pos` unchanged if there is none ('\f' and '\v' are not Markdoc whitespace).
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

// Markdoc identifiers can start with a digit or dash (`1x`, `-x`), so this is the same as
// `isIdentChar`.
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
 * Scans a bracketed run (`[...]`, `{...}` or `(...)`) at `pos`, ignoring brackets inside
 * quoted strings. Returns the position after the closing bracket, or -1 if it never closes.
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
      if (p >= end) return -1;
      p++;
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
  return -1;
}

interface ScannedValue {
  kind: MarkdocValueKind;
  value: string | number | boolean | null;
  endPos: number;
}

/** Scans a double-quoted string starting at `pos`, decoding `\"` and `\\` escapes. */
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
  return null;
}

/**
 * Scans a Markdoc number: `'-'? [0-9]+ ('.'[0-9]+)?`. There is no exponent, so in
 * `2e3` only `2` is the number. The caller has checked that a digit (or `-` and a digit) is at `pos`.
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
 * Scans the parts after a variable name: `.name` or `[number]` or `["string"]`.
 * No whitespace is allowed, so `$foo[ 0 ]` and `$foo[bar]` are errors, while
 * `$foo.bar["x"].baz` is fine.
 *
 * A part that does not match is left unconsumed, so the caller sees leftover text
 * (for example after `$foo.`). Returns `pos` unchanged if there is no part.
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
        if (!str) break;
        valueEnd = str.endPos;
      } else if (
        isDigit(text[bracketValueStart]) ||
        (text[bracketValueStart] === '-' && isDigit(text[bracketValueStart + 1]))
      ) {
        valueEnd = scanNumber(text, bracketValueStart, end).endPos;
      } else {
        break;
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
 * Scans one value at `pos`: a string, number, `true`, `false`, `null`, a `$` or `@`
 * variable, a function call, an array or an object. A bare word is not a value
 * here; see `scanBareword`. Returns `null` if no value starts at `pos`.
 */
function scanValue(text: string, pos: number, end: number): ScannedValue | null {
  const ch = text[pos];
  if (ch === '"') return scanString(text, pos, end);

  // Both `$` and `@` start a variable.
  if (ch === '$' || ch === '@') {
    const identEnd = scanIdentifier(text, pos + 1, end);
    if (identEnd === pos + 1) return null;
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
 * Scans a bare word used as a value (`name=star`, `{% if maybe %}`). Markdoc rejects
 * these, but recognizing them lets a rule tell the user to quote the value.
 */
function scanBareword(text: string, pos: number, end: number): ScannedValue | null {
  const identEnd = scanIdentifier(text, pos, end);
  if (identEnd === pos) return null;
  return { kind: 'bareword', value: text.slice(pos, identEnd), endPos: identEnd };
}

/**
 * Scans the value right after the tag name (`{% if $flag %}`, `{% image "a.png" /%}`).
 * Like Markdoc, it takes whatever value matches first, even if that is only the start
 * of an identifier:
 *
 *   `{% icon 1x="star" %}` -> primary `1`, then attribute `x="star"`
 *   `{% t null=1 %}`       -> primary `null`, then `=1` is an error
 *
 * If no value matches, a bare word followed by `=` is the first attribute name (this
 * includes `{% t a = 1 %}`, which is reported as a spacing error). Any other bare word
 * is a bareword primary. Returns `null` if nothing matches.
 */
function scanPrimaryValue(text: string, pos: number, end: number): ScannedValue | null {
  const value = scanValue(text, pos, end);
  if (value) return value;

  const bareword = scanBareword(text, pos, end);
  if (!bareword) return null;
  let p = bareword.endPos;
  while (p < end && isSpace(text[p])) p++;
  if (p < end && text[p] === '=') return null;
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
 * Scans `name=value` pairs and, when `allowShortcuts` is set, `.class` and `#id`
 * shortcuts, from `startPos` to `end`. Stops at `end` or at the first error.
 *
 * No spaces are allowed around `=`, so `a = 1` is an error.
 *
 * `leadingIsSpace` decides what counts as whitespace before the first item. Later gaps
 * accept any whitespace.
 *
 * A shortcut after another item needs whitespace before it. Without it, the scan
 * falls through to the attribute name, which fails on `.` or `#`, so `{% t .a.b %}` is
 * rejected like in Markdoc.
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

/** An annotation: no name, and the body is not parsed. */
function annotation(): ParsedMarkdocSpan {
  return { kind: 'annotation', name: null, attributes: [], nameStart: 0, nameEnd: 0 };
}

/**
 * Parses the text of one `{% ... %}` span. Offsets in the result are 0-based
 * indexes into `spanText`. Never throws; invalid text gives `kind: 'malformed'`.
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

  // `{%-` and `-%}` trim markers. The `end - 1 >= start` check stops the `-` in
  // `{%-%}` from being used twice.
  if (spanText[start] === '-') start++;
  if (end - 1 >= start && spanText[end - 1] === '-') end--;

  if (start > end) {
    return malformed('span delimiters leave no room for a body');
  }

  // A trailing `/` marks a self-closing tag, like `{% partial ... /%}`.
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

  // Annotation starting with `#` or `.`: `{% #id .class ... %}`. The body is not parsed.
  // The form starting with an attribute is handled further down.
  if (first === '#' || first === '.') {
    return annotation();
  }

  // Variable: `{% $name %}` or `{% @name %}`, with an optional tail such as
  // `.title` or `["bar"]`. The tail is not broken down further.
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

  // Function call: `{% equals(1,1) %}`. The `(` must directly follow the name; with a
  // space (`{% fn (1) %}`) it falls through to the tag branch below and fails there.
  // Once `name(` is seen it must be a function, so this check comes before the tag branch.
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

  // Annotation starting with an attribute: `{% width="30%" %}`, `{% class="x" #id .cls %}`.
  // Markdoc tries this before a tag, so a body of only attributes and shortcuts is an
  // annotation, not a tag. Annotation bodies are not parsed, so only accept bodies that
  // are valid in Markdoc:
  // - The whole body must scan without error. `{% a=1 b %}`, `{% a=1 "str" %}` and
  //   `{% width = "30%" %}` fall through and end up malformed.
  // - No bareword values, so `{% a=b %}` is malformed.
  // - Not self-closing, so `{% a="x" /%}` is malformed.
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

  // Otherwise it must be an open or self-closing tag: `{% name attr=val ... %}`, with an
  // optional primary value after the name, as in `{% if $flag %}`.
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
      // Only one whitespace character may separate the primary from the first attribute.
      // `{% t 1 x="y" %}` is fine but `{% t 1  x="y" %}` is an error.
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

    // After a primary value, only strict whitespace may be skipped, so a stray '\f' or
    // '\v' fails the attribute name scan.
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
