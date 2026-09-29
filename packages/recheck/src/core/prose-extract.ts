// Gets the prose text for `metric` and `recheck --readability`: no headings or markup, and
// nested segments counted once.
import type { ScopedSegment } from '../scopes/types.js';
import { BACKTICK_SPAN_RE } from './inline-code.js';

// Markdoc tags. Non-greedy, so tags next to each other are removed one by one. Only used when
// Markdoc parsing is off; otherwise tags are already masked in `segment.maskedRanges`.
const MARKDOC_TAG_RE = /\{%-?[\s\S]*?-?%\}/g;

/** Removes Markdoc tags and inline code. */
export function stripNonProse(text: string): string {
  return text.replace(MARKDOC_TAG_RE, '').replace(BACKTICK_SPAN_RE, '');
}

// Cuts masked tags out of the text instead of leaving spaces, so `<code>{% x %}</code>` is one word.
function spliceOutMaskedSpans(segment: ScopedSegment): string {
  const ranges = segment.maskedRanges;
  if (ranges === undefined) return segment.content;
  let result = '';
  let cursor = 0;
  for (const range of ranges) {
    result += segment.content.slice(cursor, Math.max(range.start, cursor));
    cursor = Math.max(range.end, cursor);
  }
  return result + segment.content.slice(cursor);
}

function comparePosition(aLine: number, aColumn: number, bLine: number, bColumn: number): number {
  return aLine - bLine || aColumn - bColumn;
}

function spanContains(outer: ScopedSegment, inner: ScopedSegment): boolean {
  return (
    comparePosition(outer.startLine, outer.startColumn, inner.startLine, inner.startColumn) <= 0 &&
    comparePosition(outer.endLine, outer.endColumn, inner.endLine, inner.endColumn) >= 0
  );
}

// Drops segments that sit inside another segment, such as a list in a blockquote, so words are
// not counted twice. Sorted so that a container comes before what it contains.
function dedupeBySpanContainment(segments: ScopedSegment[]): ScopedSegment[] {
  const ordered = [...segments].sort((a, b) => {
    const byStart = comparePosition(a.startLine, a.startColumn, b.startLine, b.startColumn);
    if (byStart !== 0) return byStart;
    return comparePosition(b.endLine, b.endColumn, a.endLine, a.endColumn);
  });

  const stack: ScopedSegment[] = [];
  const kept: ScopedSegment[] = [];
  for (const segment of ordered) {
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (comparePosition(top.endLine, top.endColumn, segment.startLine, segment.startColumn) < 0) {
        stack.pop();
      } else {
        break;
      }
    }

    const container = stack[stack.length - 1];
    if (container && spanContains(container, segment)) continue;

    kept.push(segment);
    stack.push(segment);
  }

  return kept;
}

/** Builds the prose blocks a readability score reads, from `summary` segments. */
export function extractProse(segments: ScopedSegment[]): string[] {
  // Headings are fragments, so readability tools skip them.
  const proseSegments = segments.filter((segment) => !segment.sourceScope?.startsWith('heading.'));

  const deduped = dedupeBySpanContainment(proseSegments);

  // Back to source order.
  deduped.sort((a, b) => a.startLine - b.startLine || a.startColumn - b.startColumn);

  return deduped
    .map((segment) =>
      segment.maskedRanges !== undefined
        ? spliceOutMaskedSpans(segment).replace(BACKTICK_SPAN_RE, '')
        : stripNonProse(segment.content)
    )
    .filter((text) => text.trim() !== '');
}
