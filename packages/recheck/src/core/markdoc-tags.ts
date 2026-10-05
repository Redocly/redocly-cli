import { filterByTypes } from '../parser/index.js';
import type { TokenTree } from '../parser/types.js';
import type { Fix } from '../types/index.js';
import { newLineRe } from './line-endings.js';

/**
 * The character that replaces a Markdoc tag in prose text (see `scopes/extractor.ts`). It is a
 * space, so word splitting and sentence splitting treat the tag as a gap. A user regex cannot rely
 * on this, so regex rules check match ranges instead (`ScopedSegment.maskedRanges`,
 * `nonProseRanges` in `rules/utils.ts`).
 */
export const MARKDOC_TAG_MASK_CHAR = ' ';

/**
 * The source text of one Markdoc tag on one line. A tag that spans several lines gives one entry
 * per line, because a `Fix` is always on a single line.
 */
export interface MarkdocTagSpan {
  /** 1-based source line. */
  line: number;
  /** 1-based, inclusive. */
  startColumn: number;
  /** 1-based, exclusive. */
  endColumn: number;
  /** The source bytes between those columns — what must survive a fix. */
  text: string;
}

/**
 * The source span of every Markdoc tag in `content`, split by line. Empty when Markdoc parsing is
 * off. Uses `filterByTypes` to skip tokens that repeat the position of their `htmlFlow` parent.
 */
export function markdocTagSpans(tree: TokenTree, content: string): MarkdocTagSpan[] {
  const tags = filterByTypes(tree, ['markdocTag']);
  if (tags.length === 0) return [];
  const sourceLines = content.split(newLineRe);
  const spans: MarkdocTagSpan[] = [];
  for (const tag of tags) {
    for (let line = tag.startLine; line <= tag.endLine; line++) {
      const sourceLine = sourceLines[line - 1] ?? '';
      const startColumn = line === tag.startLine ? tag.startColumn : 1;
      const endColumn = line === tag.endLine ? tag.endColumn : sourceLine.length + 1;
      if (endColumn <= startColumn) continue;
      spans.push({
        line,
        startColumn,
        endColumn,
        text: sourceLine.slice(startColumn - 1, endColumn - 1),
      });
    }
  }
  return spans;
}

export interface ProtectedFixes {
  /** Fixes that are safe to apply. */
  fixes: Fix[];
  /** Fixes that could not be made safe. The caller reports them as skipped. */
  dropped: Fix[];
}

/**
 * Keeps `--fix` from changing Markdoc tags. Prose text has tags masked, so a fix that replaces a
 * whole span would write the mask over the real tag and delete it. Every fix passes through here:
 *
 * - A fix that does not touch a tag is kept as is.
 * - A fix that replaces text with the same number of characters keeps its place, and the original
 *   tag text is copied back in.
 * - Any other fix that touches a tag is dropped and reported as skipped.
 *
 * A fix that changes nothing once the tags are restored is dropped too. Otherwise it would be
 * reported as fixed and proposed again on every pass of `runRulesUntilStable`.
 */
export function protectMarkdocTags(
  fixes: Fix[],
  spans: MarkdocTagSpan[],
  content: string
): ProtectedFixes {
  if (spans.length === 0 || fixes.length === 0) return { fixes, dropped: [] };

  const byLine = new Map<number, MarkdocTagSpan[]>();
  for (const span of spans) {
    const existing = byLine.get(span.line);
    if (existing) existing.push(span);
    else byLine.set(span.line, [span]);
  }
  const sourceLines = content.split(newLineRe);

  const safe: Fix[] = [];
  const dropped: Fix[] = [];
  for (const fix of fixes) {
    const lineSpans = byLine.get(fix.lineNumber);
    if (lineSpans === undefined) {
      safe.push(fix);
      continue;
    }
    const deleteCount = fix.deleteCount ?? 0;
    if (deleteCount === -1) {
      dropped.push(fix);
      continue;
    }
    const editColumn = fix.editColumn ?? 1;
    const editEnd = editColumn + deleteCount;
    const overlapped = lineSpans.filter(
      (span) => editColumn < span.endColumn && span.startColumn < editEnd
    );
    if (overlapped.length === 0) {
      safe.push(fix);
      continue;
    }
    const insertText = fix.insertText ?? '';
    const splittable =
      insertText.length === deleteCount &&
      overlapped.every((span) => span.startColumn >= editColumn && span.endColumn <= editEnd);
    if (!splittable) {
      dropped.push(fix);
      continue;
    }
    let restored = insertText;
    for (const span of overlapped) {
      const at = span.startColumn - editColumn;
      restored = restored.slice(0, at) + span.text + restored.slice(at + span.text.length);
    }
    const replaced = (sourceLines[fix.lineNumber - 1] ?? '').slice(editColumn - 1, editEnd - 1);
    if (restored === replaced) {
      dropped.push(fix);
      continue;
    }
    safe.push({ ...fix, insertText: restored });
  }
  return { fixes: safe, dropped };
}
