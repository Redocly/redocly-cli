import { newLineRe, offsetToLineColumn } from '../core/line-endings.js';
import { MARKDOC_TAG_MASK_CHAR } from '../core/markdoc-tags.js';
import { filterByTypes } from '../parser/index.js';
import type { Token, TokenTree } from '../parser/types.js';
import { splitSentences } from './sentences.js';
import type { ScopedSegment, TextRange } from './types.js';

export type { ScopedSegment } from './types.js';

function segmentFromToken(scope: string, token: Token, content?: string): ScopedSegment {
  return {
    scope,
    content: content ?? token.text,
    startLine: token.startLine,
    startColumn: token.startColumn,
    endLine: token.endLine,
    endColumn: token.endColumn,
    tokens: [token],
  };
}

function findChild(token: Token, type: string): Token | undefined {
  return token.children.find((child) => child.type === type);
}

// Explicit-stack DFS (not call-stack recursion), same pre-order,
// first-match semantics as the recursive original: pathological nesting
// must not be able to overflow the call stack anywhere in the extractor —
// see `extractScopes`'s own iterative walk below for the full rationale.
function findDescendant(token: Token, type: string): Token | undefined {
  const stack: Token[] = [];
  for (let i = token.children.length - 1; i >= 0; i--) stack.push(token.children[i]);
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    if (current.type === type) return current;
    for (let i = current.children.length - 1; i >= 0; i--) stack.push(current.children[i]);
  }
  return undefined;
}

// Like `findDescendant` above, but collects every match instead of stopping
// at the first. Children are pushed in reverse so they pop left to right,
// which returns the matches in source order — `maskProse` below depends on
// that ordering.
function findAllDescendants(token: Token, type: string): Token[] {
  const found: Token[] = [];
  const stack: Token[] = [];
  for (let i = token.children.length - 1; i >= 0; i--) stack.push(token.children[i]);
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    if (current.type === type) found.push(current);
    for (let i = current.children.length - 1; i >= 0; i--) stack.push(current.children[i]);
  }
  return found;
}

// Inverse of `offsetToLineColumn`: the character offset within `text` that
// corresponds to an absolute (line, column), given `text`'s own absolute
// start position. Needed to turn a `markdocTag` descendant's absolute
// position into an offset inside its container's text, so `maskProse` knows
// which slice of that text to blank.
function lineColumnToOffset(
  text: string,
  startLine: number,
  startColumn: number,
  line: number,
  column: number
): number {
  if (line === startLine) return column - startColumn;
  let offset = 0;
  let currentLine = startLine;
  for (const match of text.matchAll(newLineRe)) {
    currentLine++;
    offset = match.index + match[0].length;
    if (currentLine === line) break;
  }
  return offset + (column - 1);
}

interface MaskedProse {
  /** Container text with every markdoc tag span blanked in place. */
  content: string;
  /** True when at least one tag span was blanked. */
  masked: boolean;
  /** The blanked spans, as offsets into `content`. Empty when !masked. */
  maskedRanges: TextRange[];
}

// Blanks every `markdocTag` descendant's span to same-width
// MARKDOC_TAG_MASK_CHAR so prose containers (paragraph, heading, list item,
// blockquote, table cell) stop carrying the tag's literal source characters
// into word counts and sentence splitting. Newlines inside the span are left
// alone: only a block tag can contain one, and keeping them exact costs
// nothing. Blanking in place rather than removing is the point — content
// length and line structure are unchanged, so every other character keeps
// its true column and positions computed downstream stay correct with no
// special-casing.
//
// Callers pass `hasTags`, which `extractScopes` derives once per document
// from the tree's own `markdocTag` tokens. That check must be exact rather
// than a `text.includes('{%')` heuristic: most real documents merely mention
// `{%` in prose, and walking every container's subtree on all of them is
// pure cost with no possible result.
//
// The single left-to-right pass matters for the same reason: rebuilding the
// whole string once per tag would be quadratic in a container holding many
// tags. Spans are sorted and clamped so an overlapping one (tags don't nest,
// so this shouldn't happen) can only shorten the pass, never rewind the
// cursor.
function maskProse(container: Token, hasTags: boolean): MaskedProse {
  const { text } = container;
  const unmasked: MaskedProse = { content: text, masked: false, maskedRanges: [] };
  if (!hasTags) return unmasked;
  const tags = findAllDescendants(container, 'markdocTag');
  if (tags.length === 0) return unmasked;

  const offsetOf = (line: number, column: number) =>
    lineColumnToOffset(text, container.startLine, container.startColumn, line, column);
  const spans = tags
    .map((tag) => ({
      start: offsetOf(tag.startLine, tag.startColumn),
      end: offsetOf(tag.endLine, tag.endColumn),
    }))
    .sort((a, b) => a.start - b.start);

  const maskedRanges: TextRange[] = [];
  const pieces: string[] = [];
  let cursor = 0;
  for (const span of spans) {
    const start = Math.max(span.start, cursor);
    const end = Math.max(span.end, start);
    if (end === start) continue;
    pieces.push(text.slice(cursor, start));
    pieces.push(text.slice(start, end).replace(/[^\r\n]/g, MARKDOC_TAG_MASK_CHAR));
    maskedRanges.push({ start, end });
    cursor = end;
  }
  if (maskedRanges.length === 0) return unmasked;
  pieces.push(text.slice(cursor));
  return { content: pieces.join(''), masked: true, maskedRanges };
}

// A prose segment that masking reduced to blanks and whitespace carries no
// prose at all — its entire text was a markdoc tag. Emitting it only adds
// noise: a blank `summary` entry, a character count for invisible text, a
// sentence span with no words in it. Gated on `masked` so a genuinely empty
// source construct (an `||` table cell) still emits its `''` segment.
function isProseless(masked: MaskedProse): boolean {
  return masked.masked && masked.content.trim() === '';
}

// Re-bases masked ranges onto a slice `[offset, offset + length)` of the
// text they were measured against, dropping anything the slice cut away.
// Only table cells need this — they are the one scope that trims its
// content after masking (see the `tableRow` case).
function shiftRanges(ranges: TextRange[], offset: number, length: number): TextRange[] {
  const shifted: TextRange[] = [];
  for (const range of ranges) {
    const start = Math.max(range.start - offset, 0);
    const end = Math.min(range.end - offset, length);
    if (end > start) shifted.push({ start, end });
  }
  return shifted;
}

function headingLevel(token: Token): number {
  if (token.type === 'atxHeading') {
    const sequence = findChild(token, 'atxHeadingSequence');
    return sequence ? sequence.text.length : 1;
  }
  // setextHeading: '=' underline → h1, '-' → h2
  const underline = findDescendant(token, 'setextHeadingLineSequence');
  return underline && underline.text.startsWith('=') ? 1 : 2;
}

function headingText(token: Token): Token | undefined {
  return findDescendant(token, 'atxHeadingText') ?? findDescendant(token, 'setextHeadingText');
}

function ancestorCount(token: Token, types: readonly string[]): number {
  let count = 0;
  for (let current = token.parent; current; current = current.parent) {
    if (types.includes(current.type)) count++;
  }
  return count;
}

const LIST_TYPES = ['listOrdered', 'listUnordered'] as const;

// True when `token` (a `paragraph`) is the direct inline body of a
// container's `content` token whose own parent is a list item or blockquote
// — i.e. the paragraph text duplicates the container segment already
// produced for `list-item` / `blockquote`, so it should not get its own
// standalone `paragraph` segment.
function isNestedContainerParagraph(token: Token): boolean {
  const content = token.parent;
  if (!content || content.type !== 'content') return false;
  const container = content.parent;
  if (!container) return false;
  if (LIST_TYPES.includes(container.type as (typeof LIST_TYPES)[number])) return true;
  return container.type === 'blockQuote';
}

// `sentence` segments are derived from EXACTLY these three scope kinds —
// running prose where sentence boundaries are meaningful. Headings and
// table cells are deliberately NOT sentence sources: their content is
// label-like, not sentence-structured, and `scope: sentence` consumers
// (e.g. an oxford-comma rule) depend on this exact source set.
const SENTENCE_SOURCES = new Set(['paragraph', 'list-item', 'blockquote']);

// Non-prose block scopes that can nest inside a sentence source (a fenced
// code block, html block, or comment inside a blockquote or list item) and
// must never contribute to its sentences.
const NON_PROSE_NESTED = new Set(['code', 'html', 'comment']);

function isContainedIn(inner: ScopedSegment, outer: ScopedSegment): boolean {
  const startsAfter =
    inner.startLine > outer.startLine ||
    (inner.startLine === outer.startLine && inner.startColumn >= outer.startColumn);
  const endsBefore =
    inner.endLine < outer.endLine ||
    (inner.endLine === outer.endLine && inner.endColumn <= outer.endColumn);
  return startsAfter && endsBefore;
}

// Offset of source position (line, column) inside `segment.content`, which
// is a verbatim slice starting at (segment.startLine, segment.startColumn):
// content line 1 starts at the segment's own startColumn, later content
// lines start at source column 1.
function offsetInSegment(segment: ScopedSegment, line: number, column: number): number {
  const { content } = segment;
  let offset = 0;
  let currentLine = segment.startLine;
  while (currentLine < line && offset < content.length) {
    const ch = content[offset];
    offset++;
    if (ch === '\n') currentLine++;
    else if (ch === '\r') {
      if (content[offset] === '\n') offset++;
      currentLine++;
    }
  }
  return Math.min(
    content.length,
    offset + column - (currentLine === segment.startLine ? segment.startColumn : 1)
  );
}

function shiftSpans(
  spans: ReturnType<typeof splitSentences>,
  by: number
): ReturnType<typeof splitSentences> {
  if (by === 0) return spans;
  return spans.map((span) => ({ ...span, start: span.start + by, end: span.end + by }));
}

// `summary` = the document's prose: every scope kind whose content is
// human-readable text. That's the sentence sources above PLUS headings
// (all levels) and table header/body cells. `code`, `frontmatter`, `html`,
// `comment`, `alt`, and `link` are never prose.
//
// This set also defines which scopes get markdoc-masked: prose is exactly the
// content a tag's `{% ... %}` syntax must not leak into. Exported so tests
// can enumerate it and require a masking fixture per member, so a new prose
// scope can't be added without a deliberate decision about masking.
export const SUMMARY_BLOCK_SOURCES = new Set([...SENTENCE_SOURCES, 'table.header', 'table.cell']);

// Headings only ever arrive as level-qualified segments (the walker emits
// `heading.h1`..`heading.h6`, never a bare 'heading' scope).
export function isSummarySource(scope: string): boolean {
  return SUMMARY_BLOCK_SOURCES.has(scope) || scope.startsWith('heading.');
}

export function extractScopes(tree: TokenTree, _content: string): ScopedSegment[] {
  const segments: ScopedSegment[] = [];

  // Every `markdocTag` token in the document, resolved once. It has two jobs:
  // it is the source for the `markdoc.tag` scope emitted at the bottom of this
  // function, and its emptiness is the gate that keeps `maskProse` from
  // walking a subtree that cannot contain a tag. With markdoc parsing off no
  // `markdocTag` tokens exist, so masking is skipped outright rather than
  // guessed at from the text.
  //
  // `filterByTypes` rather than a raw `tree.flat.filter` so htmlFlow-reparsed
  // tokens are excluded on the same terms every other consumer uses. One list
  // can serve both jobs because reparsed content hangs under an `htmlFlow`
  // token, which the walk below never descends into, so a tag this filter
  // drops was never maskable anyway.
  const markdocTags = filterByTypes(tree, ['markdocTag']);
  const hasMarkdocTags = markdocTags.length > 0;

  // The single place prose segments are emitted, so masking and everything
  // that follows from it are decided once instead of at each call site: the
  // mask itself, the `maskedRanges` a rule needs to reject a match inside a
  // tag, the verbatim `sourceText` a rule needs to quote real source, and the
  // suppression of a segment masking left with no prose in it. Table cells are
  // the one caller that can't use this, because they re-anchor onto trimmed
  // content, but they still mask through the same `maskProse`.
  const emitProse = (scope: string, anchor: Token): ScopedSegment | undefined => {
    const masked = maskProse(anchor, hasMarkdocTags);
    if (isProseless(masked)) return undefined;
    const segment = segmentFromToken(scope, anchor, masked.content);
    if (masked.masked) {
      segment.sourceText = anchor.text;
      segment.maskedRanges = masked.maskedRanges;
    }
    segments.push(segment);
    return segment;
  };

  // Returns whether the walk should descend into `token`'s children —
  // replacing the recursive walker's `return` (skip children) vs `break`
  // (descend) convention. Kept as a per-token visitor so the iterative
  // driver below is a plain pre-order DFS over an explicit stack: the old
  // call-stack recursion overflowed on deeply nested input (e.g. ~10,000
  // nested blockquotes) that micromark itself parses without issue, so
  // recursion depth here must not track document nesting depth.
  const visit = (token: Token): boolean => {
    switch (token.type) {
      case 'atxHeading':
      case 'setextHeading': {
        const level = headingLevel(token);
        const text = headingText(token);
        const anchor = text ?? token;
        // An annotation tag (`# Head {% #main %}`) is tokenized as a child of
        // the heading's own text token, so heading content needs the same
        // masking as paragraph content — otherwise `summary`, which includes
        // every heading level, would leak the tag's text.
        const segment = emitProse(`heading.h${level}`, anchor);
        if (segment) segment.metadata = { headingLevel: level };
        return false; // no scopes nested inside headings
      }
      case 'paragraph': {
        // Paragraphs nested directly inside a list-item's `content` or a
        // blockquote's `content` are the inline representation of that
        // container's own segment (list-item / blockquote already cover the
        // same span) — only emit a standalone `paragraph` segment when this
        // paragraph isn't merely restating an ancestor container segment, so
        // summary derivation doesn't double-count the same text twice.
        if (!isNestedContainerParagraph(token)) emitProse('paragraph', token);
        return true; // continue walking for inline scopes
      }
      // `alt` and `link` are deliberately NOT masked, unlike the prose scopes
      // around them, even though a markdoc tag can appear inside a label
      // (`[text {% x /%} more](url)`). They aren't prose: neither feeds
      // `summary` or `sentence`, and nothing splits them into words or
      // sentences, so the reasons prose is masked don't apply. Rules pointed
      // at these scopes — an alt-text length cap, a pattern rule on link text
      // — are pointed at the label as authored, and blanking part of it would
      // hide authored content from the very rule asked to inspect it. Nothing
      // is at risk either: `--fix` tag safety comes from `protectMarkdocTags`
      // in core/markdoc-tags.ts, not from masking.
      case 'image': {
        const label = findDescendant(token, 'labelText');
        if (label) segments.push(segmentFromToken('alt', label));
        return false;
      }
      case 'link': {
        const label = findDescendant(token, 'labelText');
        if (label) segments.push(segmentFromToken('link', label));
        return true; // link text may contain other inline tokens
      }
      case 'codeFenced':
      case 'codeIndented': {
        const info = findDescendant(token, 'codeFencedFenceInfo');
        const segment = segmentFromToken('code', token);
        segment.metadata = { codeLanguage: info?.text ?? '' };
        segments.push(segment);
        return false;
      }
      case 'blockQuote': {
        emitProse('blockquote', token);
        return true;
      }
      case 'listItemPrefix': {
        return true; // marker only; content handled via parent list walk
      }
      case 'content': {
        if (token.parent && LIST_TYPES.includes(token.parent.type as (typeof LIST_TYPES)[number])) {
          const segment = emitProse('list-item', token);
          if (segment) {
            segment.metadata = {
              listDepth: ancestorCount(token, LIST_TYPES as unknown as string[]),
            };
          }
        }
        return true;
      }
      case 'tableRow': {
        // Header row vs body row is determined by the ancestor: `tableHead`
        // wraps the header `tableRow` (plus the delimiter row), `tableBody`
        // wraps body rows. Cells are `tableHeader` (in the header row) or
        // `tableData` (in body rows), each containing a `tableContent` with
        // the cell's inline text.
        //
        // Positions anchor on the `tableContent` token, NOT the cell token:
        // the cell spans its leading '|' and padding (`| colour ` for
        // `| colour |`), so a segment carrying trimmed content with the
        // cell's startColumn put every match 2+ columns LEFT of the real
        // text — and a swap --fix then rewrote the pipe/padding instead of
        // the matched word. The content is still trimmed (semantic cell
        // text), so the anchor shifts by the leading-trim length and the
        // end by the trailing-trim length, keeping the recorded span
        // byte-identical to `content` in the source (the alignment
        // invariant locked in scopes/__tests__/extractor.test.ts). Trim
        // lengths and columns both count UTF-16 code units, matching
        // offsetToLineColumn and Fix.editColumn arithmetic. Table cells are
        // single-line by construction, so plain column arithmetic is safe.
        // Cells with no `tableContent` (empty `||` / whitespace-only) keep
        // the cell token's own position: content '' has no text to anchor
        // on, trivially satisfies the invariant, and can never contain a
        // match.
        const inHead = token.parent?.type === 'tableHead';
        const scope = inHead ? 'table.header' : 'table.cell';
        const cellTypes = inHead ? ['tableHeader'] : ['tableData'];
        for (const cell of token.children.filter((child) => cellTypes.includes(child.type))) {
          const text = findDescendant(cell, 'tableContent');
          if (!text) {
            segments.push(segmentFromToken(scope, cell, ''));
            continue;
          }
          // Masked before trimming, not after: a tag flush against the cell's
          // pipe padding becomes whitespace too, so `trim()` folds it into
          // `leadingTrim` exactly like real padding. Same leading-trim-adjusted
          // anchor as above, just computed over the masked text.
          const masked = maskProse(text, hasMarkdocTags);
          if (isProseless(masked)) continue;
          const leadingTrim = masked.content.length - masked.content.trimStart().length;
          const content = masked.content.trim();
          const segment = segmentFromToken(scope, cell, content);
          segment.startLine = text.startLine;
          segment.startColumn = text.startColumn + leadingTrim;
          segment.endLine = text.startLine;
          segment.endColumn = segment.startColumn + content.length;
          if (masked.masked) {
            // Shifted by the same leading trim the content was, and clipped
            // to what survived it, so the ranges stay offsets into THIS
            // segment's `content` (a tag folded entirely into the trim
            // leaves no range at all).
            segment.sourceText = text.text.slice(leadingTrim, leadingTrim + content.length);
            segment.maskedRanges = shiftRanges(masked.maskedRanges, leadingTrim, content.length);
          }
          segments.push(segment);
        }
        return false;
      }
      case 'yaml': {
        segments.push(segmentFromToken('frontmatter', token));
        return false;
      }
      case 'htmlFlow': {
        const isComment = token.text.trimStart().startsWith('<!--');
        segments.push(segmentFromToken(isComment ? 'comment' : 'html', token));
        return false;
      }
      default:
        return true;
    }
  };

  // Iterative pre-order DFS: children are pushed in reverse so they pop in
  // document order, reproducing the recursive walker's segment ordering
  // exactly (visit parent, then each child subtree left to right).
  const stack: Token[] = [];
  for (let i = tree.children.length - 1; i >= 0; i--) stack.push(tree.children[i]);
  while (stack.length > 0) {
    const token = stack.pop();
    if (token === undefined) break;
    if (visit(token)) {
      for (let i = token.children.length - 1; i >= 0; i--) stack.push(token.children[i]);
    }
  }

  const summarySegments = segments
    .filter((segment) => isSummarySource(segment.scope))
    .map((segment) => ({ ...segment, scope: 'summary', sourceScope: segment.scope }));

  const sentenceSegments: ScopedSegment[] = [];
  // A container segment (blockquote, list-item) is a verbatim source slice,
  // so a code fence, html block, or comment nested inside it is still
  // present in the container's own content — but it is not prose, and a
  // "sentence" must never span or contain it. Each container's content is
  // therefore split at its nested non-prose ranges, and sentences derive
  // from the prose chunks between them.
  const nestedNonProse = segments.filter((segment) => NON_PROSE_NESTED.has(segment.scope));
  for (const segment of segments) {
    if (!SENTENCE_SOURCES.has(segment.scope)) continue;
    const exclusions = nestedNonProse
      .filter((nested) => nested !== segment && isContainedIn(nested, segment))
      .map((nested) => ({
        start: offsetInSegment(segment, nested.startLine, nested.startColumn),
        end: offsetInSegment(segment, nested.endLine, nested.endColumn),
      }))
      .sort((a, b) => a.start - b.start);
    const chunks: Array<{ start: number; end: number }> = [];
    let cursor = 0;
    for (const exclusion of exclusions) {
      if (exclusion.start > cursor) chunks.push({ start: cursor, end: exclusion.start });
      cursor = Math.max(cursor, exclusion.end);
    }
    if (cursor < segment.content.length)
      chunks.push({ start: cursor, end: segment.content.length });
    for (const chunk of chunks)
      for (const span of shiftSpans(
        splitSentences(segment.content.slice(chunk.start, chunk.end)),
        chunk.start
      )) {
        // offsetToLineColumn (never a bare '\n' split): segment content is a
        // verbatim source slice, so on a CR-only file a '\n'-based mapping
        // kept every sentence on the segment's first line with a column
        // counted straight through the '\r'. On the segment's first line the
        // sentence offset is added to the segment's own startColumn (the
        // segment may begin mid-source-line); later lines start at column 1
        // of the source, so the in-segment column is already the source
        // column.
        const start = offsetToLineColumn(segment.content, span.start);
        const end = offsetToLineColumn(segment.content, span.end);
        const sentence: ScopedSegment = {
          scope: 'sentence',
          content: span.text,
          startLine: segment.startLine + start.line - 1,
          startColumn: start.line === 1 ? segment.startColumn + span.start : start.column,
          endLine: segment.startLine + end.line - 1,
          endColumn: end.line === 1 ? segment.startColumn + span.end : end.column,
          tokens: segment.tokens,
        };
        // A sentence carved out of a masked segment is masked too — re-based
        // onto its own span so `sourceText`/`maskedRanges` keep meaning what
        // they mean everywhere else: offsets into THIS segment's `content`.
        if (segment.sourceText !== undefined) {
          sentence.sourceText = segment.sourceText.slice(span.start, span.start + span.text.length);
          sentence.maskedRanges = shiftRanges(
            segment.maskedRanges ?? [],
            span.start,
            span.text.length
          );
        }
        sentenceSegments.push(sentence);
      }
  }
  // `markdoc.tag` emits one segment per `markdocTag` token, whatever its
  // `markdocKind` (malformed spans included — a pattern rule may well want to
  // target those) and wherever it sits: a block sibling, an inline child of a
  // paragraph or heading, or nested in a table cell. Sourced from the
  // document's token list rather than from the walk, because the walk stops
  // descending once a `tableRow` has emitted its cell segments and so never
  // reaches a tag inside a cell. With markdoc parsing off no `markdocTag`
  // tokens exist, so this is always `[]`.
  //
  // The sort is a no-op today: `filterByTypes` excludes `inHtmlFlow` tokens,
  // and no `markdocTag` token is ever produced with that flag anyway, because
  // `reparseHtmlFlow` re-tokenizes an html block's text with the base
  // extensions only — `markdocSyntax` is not among them, so a `{% ... %}` span
  // inside `<div>...</div>` never becomes a `markdocTag` at all. Every entry
  // therefore arrives in strict document order. Kept because it costs nothing
  // and becomes load-bearing again the moment something (a markdoc-aware
  // `reparseHtmlFlow`, most plausibly) can append a `markdocTag` out of order,
  // which `computeMarkdocPairing` in parser/markdoc/pairing.ts already has to
  // handle.
  const markdocTagSegments = [...markdocTags]
    .sort((a, b) => a.startLine - b.startLine || a.startColumn - b.startColumn)
    .map((token) => segmentFromToken('markdoc.tag', token));

  return [...segments, ...summarySegments, ...sentenceSegments, ...markdocTagSegments];
}
