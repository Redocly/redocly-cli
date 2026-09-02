// Post-parse structuring pass for `markdocTag` tokens: the micromark extension
// in `syntax.ts` recognizes span boundaries only, and this pass parses each
// span's own text via the pure `parseMarkdocSpan` scanner (span.ts) and
// synthesizes child tokens (open/close markers, tag name, primary value,
// attributes, class/id shortcuts) with document-absolute positions, mutating
// the tree in place the way `reparseHtmlFlow` (parser/index.ts) does for HTML.
//
// There is no `content` parameter: every `markdocTag` token's own `.text` is
// already the exact span text, so there is nothing left to re-slice from the
// surrounding document.
import { offsetToLineColumn } from '../../core/line-endings.js';
import type { Token, TokenTree } from '../types.js';
import { parseMarkdocSpan, type MarkdocAttribute } from './span.js';

/**
 * Maps a 0-based offset into `tagToken.text` to an absolute document line and
 * column. Only line 1 of the span inherits `startColumn` as its column origin,
 * because every later line starts at column 1 of the real document.
 * `offsetToLineColumn` (core/line-endings.ts) is the shared CRLF/CR/LF-aware
 * mapper, so this file counts lines the same way the tokenizer does.
 *
 * Exported so a rule holding a span-relative offset but no synthesized child
 * token to borrow a position from can reuse this instead of re-deriving the
 * same math.
 */
export function offsetToPosition(
  tagToken: Token,
  offset: number
): { line: number; column: number } {
  const { line, column } = offsetToLineColumn(tagToken.text, offset);
  return {
    line: tagToken.startLine + (line - 1),
    column: line === 1 ? tagToken.startColumn + (column - 1) : column,
  };
}

/**
 * Builds a synthesized child token spanning `[start, end)` of `tagToken`'s own
 * text. Offsets are always relative to the tag, even for a grandchild like
 * `markdocAttributeValue`, whose structural `parent` is the `markdocAttribute`
 * wrapper rather than the tag itself.
 */
function synthesize(
  tagToken: Token,
  type: string,
  start: number,
  end: number,
  parent: Token = tagToken
): Token {
  const startPos = offsetToPosition(tagToken, start);
  const endPos = offsetToPosition(tagToken, end);
  return {
    type,
    startLine: startPos.line,
    startColumn: startPos.column,
    endLine: endPos.line,
    endColumn: endPos.column,
    text: tagToken.text.slice(start, end),
    children: [],
    parent,
  };
}

/**
 * Boundaries of the opening (`{%`/`{%-`) and closing (`%}`/`-%}`) markers within
 * a span's own text. `ParsedMarkdocSpan` carries no marker offsets, and
 * re-deriving them here needs no parsing: the tokenizer in `syntax.ts` only ever
 * emits a `markdocTag` whose text starts with a literal `{%` and ends with a
 * literal `%}`, so slicing those two fixed-width delimiters plus an optional
 * trim `-` is safe. This mirrors `parseMarkdocSpan`'s own `{%-`/`-%}` stripping
 * (span.ts), so a change there must be mirrored here too.
 */
function markerBounds(text: string): { openEnd: number; closeStart: number } {
  let openEnd = 2; // past the leading '{%'
  let closeStart = text.length - 2; // start of the trailing '%}'
  if (text[openEnd] === '-') openEnd++;
  if (closeStart - 1 >= openEnd && text[closeStart - 1] === '-') closeStart--;
  return { openEnd, closeStart };
}

/** One non-attribute child to synthesize, described by its span-relative `[start, end)` bounds. */
interface SimpleChild {
  kind: 'simple';
  type: string;
  start: number;
  end: number;
}

interface AttributeChild {
  kind: 'attribute';
  attribute: MarkdocAttribute;
}

type PendingChild = SimpleChild | AttributeChild;

function startOf(item: PendingChild): number {
  return item.kind === 'simple' ? item.start : item.attribute.nameStart;
}

/**
 * Re-tokenizes every `markdocTag` token's own text via `parseMarkdocSpan` and
 * appends the resulting children -- open/close markers, tag name, primary value,
 * attributes (each wrapping a name/value pair), and class/id shortcuts -- both
 * under the tag token itself in source order and into `tree.flat`, which is
 * appended to rather than globally re-sorted (the same convention
 * `reparseHtmlFlow` follows). Only ever called behind `ParseOptions.markdoc`,
 * and flag-off parses produce no `markdocTag` tokens at all, so flag-off output
 * is untouched.
 */
export function structureMarkdocTags(tree: TokenTree): void {
  const appended: Token[] = [];

  for (const token of tree.flat) {
    if (token.type !== 'markdocTag') continue;

    const parsed = parseMarkdocSpan(token.text);
    token.markdocKind = parsed.kind;

    const { openEnd, closeStart } = markerBounds(token.text);
    const pending: PendingChild[] = [
      { kind: 'simple', type: 'markdocTagMarker', start: 0, end: openEnd },
      { kind: 'simple', type: 'markdocTagMarker', start: closeStart, end: token.text.length },
    ];

    // Annotation, variable, function, and malformed spans carry no tag name, so
    // none of them gets a name child.
    if (parsed.name !== null) {
      pending.push({
        kind: 'simple',
        type: 'markdocTagName',
        start: parsed.nameStart,
        end: parsed.nameEnd,
      });
    }

    if (parsed.primary) {
      pending.push({
        kind: 'simple',
        type: 'markdocTagPrimary',
        start: parsed.primary.valueStart,
        end: parsed.primary.valueEnd,
      });
    }

    for (const attribute of parsed.attributes) {
      pending.push({ kind: 'attribute', attribute });
    }

    // Shortcuts are only present for named tag-open and self-closing spans, and
    // are absent rather than empty for every other kind.
    for (const shortcut of parsed.shortcuts ?? []) {
      pending.push({
        kind: 'simple',
        type: 'markdocShortcut',
        start: shortcut.start,
        end: shortcut.end,
      });
    }

    // Markers sit at the fixed extremes and name/primary/attributes/shortcuts
    // can never overlap each other, so sorting by start offset alone reproduces
    // the document order micromark uses for a token's `children` array.
    pending.sort((a, b) => startOf(a) - startOf(b));

    for (const item of pending) {
      if (item.kind === 'simple') {
        const child = synthesize(token, item.type, item.start, item.end);
        token.children.push(child);
        appended.push(child);
        continue;
      }

      const { attribute } = item;
      const attributeToken = synthesize(
        token,
        'markdocAttribute',
        attribute.nameStart,
        attribute.valueEnd
      );
      const nameToken = synthesize(
        token,
        'markdocAttributeName',
        attribute.nameStart,
        attribute.nameEnd,
        attributeToken
      );
      const valueToken = synthesize(
        token,
        'markdocAttributeValue',
        attribute.valueStart,
        attribute.valueEnd,
        attributeToken
      );
      attributeToken.children.push(nameToken, valueToken);
      token.children.push(attributeToken);
      appended.push(attributeToken, nameToken, valueToken);
    }
  }

  // Pushed one at a time rather than spread as arguments: `push(...appended)`
  // throws `RangeError: Maximum call stack size exceeded` once `appended`
  // outgrows the engine's argument limit, which a document with tens of
  // thousands of tags reaches, and this pass must never throw on a large
  // document.
  for (const token of appended) tree.flat.push(token);
}
