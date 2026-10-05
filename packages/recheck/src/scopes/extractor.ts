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

// Uses an explicit stack instead of recursion, so deeply nested input cannot overflow the call stack.
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

// Like `findDescendant`, but collects every match, in source order.
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

// Inverse of `offsetToLineColumn`: the offset within `text` of an absolute (line, column),
// given the absolute start position of `text`.
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

// Replaces every `markdocTag` span inside the container with mask characters, so tag syntax
// is not counted as words or split into sentences. The text keeps its length and line breaks,
// so all other positions stay correct. `hasTags` comes from `extractScopes`, which checks the
// tree's `markdocTag` tokens, so documents without tags skip the subtree walk.
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

// True when masking left only blanks, i.e. the whole text was a markdoc tag. Such a segment
// is dropped. An empty source construct (an `||` table cell) is not masked, so it is kept.
function isProseless(masked: MaskedProse): boolean {
  return masked.masked && masked.content.trim() === '';
}

// Moves masked ranges onto a slice `[offset, offset + length)` of the text, dropping the
// parts the slice cuts off. Table cells need this because they are trimmed after masking.
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

// True when `token` (a `paragraph`) is the body of a list item or blockquote. The container
// already has its own segment, so the paragraph does not get a separate one.
function isNestedContainerParagraph(token: Token): boolean {
  const content = token.parent;
  if (!content || content.type !== 'content') return false;
  const container = content.parent;
  if (!container) return false;
  if (LIST_TYPES.includes(container.type as (typeof LIST_TYPES)[number])) return true;
  return container.type === 'blockQuote';
}

// Sentences come from these scopes only. Headings and table cells are labels, not sentences.
const SENTENCE_SOURCES = new Set(['paragraph', 'list-item', 'blockquote']);

// Block scopes that can sit inside a blockquote or list item but are not part of its sentences.
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

// Offset of source position (line, column) inside `segment.content`. The first content line
// starts at the segment's `startColumn`; later lines start at column 1.
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

// `summary` is the document's prose: the sentence sources plus headings and table cells.
// This set also decides which scopes get markdoc-masked.
const SUMMARY_BLOCK_SOURCES = new Set([...SENTENCE_SOURCES, 'table.header', 'table.cell']);

// Headings arrive as `heading.h1` to `heading.h6`, never a bare 'heading'.
export function isSummarySource(scope: string): boolean {
  return SUMMARY_BLOCK_SOURCES.has(scope) || scope.startsWith('heading.');
}

export function extractScopes(tree: TokenTree, _content: string): ScopedSegment[] {
  const segments: ScopedSegment[] = [];

  // Every `markdocTag` token in the document. Used for the `markdoc.tag` scope at the end,
  // and to skip masking when there are no tags.
  const markdocTags = filterByTypes(tree, ['markdocTag']);
  const hasMarkdocTags = markdocTags.length > 0;

  // Emits a prose segment: masks tags, records `maskedRanges` and `sourceText` for rules,
  // and drops segments that are only a tag. Table cells do their own anchoring after masking.
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

  // Returns whether the walk should descend into the token's children.
  const visit = (token: Token): boolean => {
    switch (token.type) {
      case 'atxHeading':
      case 'setextHeading': {
        const level = headingLevel(token);
        const text = headingText(token);
        const anchor = text ?? token;
        // An annotation tag (`# Head {% #main %}`) is a child of the heading text, so mask it
        // like paragraph text.
        const segment = emitProse(`heading.h${level}`, anchor);
        if (segment) segment.metadata = { headingLevel: level };
        return false; // no scopes nested inside headings
      }
      case 'paragraph': {
        // A paragraph inside a list item or blockquote repeats the container's segment,
        // so only emit it when it is not nested in one.
        if (!isNestedContainerParagraph(token)) emitProse('paragraph', token);
        return true; // continue walking for inline scopes
      }
      // `alt` and `link` are not masked: they are not prose, and rules on them should see the
      // label as written.
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
        // The ancestor tells header from body: `tableHead` holds the header row, `tableBody`
        // the body rows.
        //
        // Positions anchor on the `tableContent` token, not the cell token, because the cell
        // also covers the leading '|' and padding. The content is trimmed, so the start moves
        // by the leading trim and the end by the trailing trim. Cells with no `tableContent`
        // (empty or whitespace-only) keep the cell's own position.
        const inHead = token.parent?.type === 'tableHead';
        const scope = inHead ? 'table.header' : 'table.cell';
        const cellTypes = inHead ? ['tableHeader'] : ['tableData'];
        for (const cell of token.children.filter((child) => cellTypes.includes(child.type))) {
          const text = findDescendant(cell, 'tableContent');
          if (!text) {
            segments.push(segmentFromToken(scope, cell, ''));
            continue;
          }
          // Mask before trimming, so a tag next to the cell padding is trimmed like padding.
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
            // Shift the ranges by the leading trim and clip them to the trimmed content.
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

  // Walk the tree in document order, using an explicit stack.
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
  // A blockquote or list item segment still contains nested code, html and comment blocks.
  // Split its content around them, and take sentences from the prose chunks in between.
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
        // Use `offsetToLineColumn`, not a split on '\n', so CR-only files map correctly. On the
        // first line, add the segment's `startColumn`; later lines start at column 1.
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
        // A sentence from a masked segment is masked too, with ranges relative to its own content.
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
  // One `markdoc.tag` segment per `markdocTag` token, wherever it sits. It comes from the
  // token list, not the walk, because the walk does not descend into table cells.
  const markdocTagSegments = [...markdocTags]
    .sort((a, b) => a.startLine - b.startLine || a.startColumn - b.startColumn)
    .map((token) => segmentFromToken('markdoc.tag', token));

  return [...segments, ...summarySegments, ...sentenceSegments, ...markdocTagSegments];
}
