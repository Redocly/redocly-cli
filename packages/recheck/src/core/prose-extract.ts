// Whole-document prose extraction shared by the `metric` assertion and the
// `recheck --readability` action: heading segments excluded, markup stripped,
// nested spans counted once. Callers compute statistics per block and sum,
// so a block's end is an unconditional sentence end.
import type { ScopedSegment } from '../scopes/types.js';
import { BACKTICK_SPAN_RE } from './inline-code.js';

// Markdoc tag-marker spans. Non-greedy, so back-to-back tags strip as
// separate spans instead of one tag's opener swallowing the prose before
// the next tag's closer. Only used when markdoc parsing is off; with it on,
// tag spans arrive pre-masked in `segment.maskedRanges`.
const MARKDOC_TAG_RE = /\{%-?[\s\S]*?-?%\}/g;

/** Strips markup that is never readable prose. Exported for direct unit testing. */
export function stripNonProse(text: string): string {
  return text.replace(MARKDOC_TAG_RE, '').replace(BACKTICK_SPAN_RE, '');
}

// Splices masked tag spans OUT of the content instead of reading through the
// mask's spaces: a tag flush against text (`<code>{% x %}</code>`) must
// count as one word, not two.
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

// Drops segments whose source span is fully nested inside another kept
// segment's span (a list inside a blockquote emits both), so nested words
// are never scored twice. Sorted by start ascending with ties broken by
// span DESCENDING, a container is always visited before anything inside it.
// Block spans never partially overlap, so after popping ended containers,
// the stack top is the only span a candidate can nest inside.
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
  // Headings read as sentence fragments, so standard tools strip them.
  const proseSegments = segments.filter((segment) => !segment.sourceScope?.startsWith('heading.'));

  const deduped = dedupeBySpanContainment(proseSegments);

  // Restore source order; the dedup sort breaks ties by span, not position.
  deduped.sort((a, b) => a.startLine - b.startLine || a.startColumn - b.startColumn);

  return deduped
    .map((segment) =>
      segment.maskedRanges !== undefined
        ? spliceOutMaskedSpans(segment).replace(BACKTICK_SPAN_RE, '')
        : stripNonProse(segment.content)
    )
    .filter((text) => text.trim() !== '');
}
