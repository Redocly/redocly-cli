import { filterByTypes } from '../parser/index.js';
import type { TokenTree } from '../parser/types.js';
import type { Fix } from '../types/index.js';
import { newLineRe } from './line-endings.js';

/**
 * The character `scopes/extractor.ts` blanks a markdoc tag's span with when
 * building prose content. A SPACE, deliberately, and not
 * `core/inline-code.ts`'s `\0` sentinel:
 *
 * - Recheck's prose model must read a tag's span as a GAP, and the word
 *   tokenizers, `String.prototype.trim`, and the sentence splitter all agree on
 *   whitespace, so a space makes every one of them treat the tag as absent.
 * - A user-supplied regex must NOT read it as a gap, and no sentinel can give
 *   that: `\0` stops `\s+` from crossing a tag, but a negated class (`[^,]+`)
 *   walks straight through it either way. Regex rules therefore have to reject
 *   a match by RANGE, after the fact, against the unmodified text — see
 *   `ScopedSegment.maskedRanges` and `nonProseRanges` in `rules/utils.ts`.
 */
export const MARKDOC_TAG_MASK_CHAR = ' ';

/**
 * One markdoc tag's verbatim source bytes on ONE line. A block tag whose
 * attributes are broken across lines (`{% table\n  x=1 %}`) contributes one
 * entry per line it covers, so every entry is a plain single-line span that a
 * `Fix` — itself always confined to one line — can be compared against directly.
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
 * Every markdoc tag's source span in `content`, split per line (see
 * `MarkdocTagSpan`). Empty for a flag-off parse, since no `markdocTag` tokens
 * exist in the tree at all, so `--fix` behaves byte-identically.
 *
 * Uses `filterByTypes` rather than a raw `tree.flat.filter` so htmlFlow-reparsed
 * tokens are excluded on the same terms as for every other consumer: they
 * duplicate positions already covered by their `htmlFlow` parent, and treating a
 * duplicate as a protected span would block fixes on a line with no real tag.
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
  /** Fixes safe to apply — tag-overlapping ones with their tags restored. */
  fixes: Fix[];
  /** Fixes that could not be made tag-safe, for the caller's skipped list. */
  dropped: Fix[];
}

/**
 * The choke point that keeps `--fix` from rewriting a markdoc tag's bytes.
 *
 * Prose scope content is masked (see `MARKDOC_TAG_MASK_CHAR`), which breaks the
 * precondition every whole-span rewriter relied on: `ScopedSegment.content` used
 * to be a verbatim source slice, so a rule replacing its whole span writes the
 * mask back over the real source and DELETES the tag. Rather than teach each such
 * rule to splice its own tags back, every fix from every rule passes through here
 * once, on its way to `applyFixesToContent`:
 *
 * - No tag on the fix's line, or no overlap with one: passes through untouched.
 *   This is the only path a flag-off run can take, so flag-off byte-identity is
 *   structural, not a special case.
 * - Overlap where the fix replaces its span with the SAME number of characters:
 *   each overlapped tag's original bytes are spliced back at their own offsets.
 *   Length preservation is what makes those offsets meaningful, and it is the
 *   same contract `restoreInlineCode` (core/inline-code.ts) already relies on.
 * - Anything else — a length-changing replacement, a fix that cuts a tag in half,
 *   a whole-line rewrite (`deleteCount: -1`) on a line with a tag — is DROPPED
 *   and reported as skipped, since there is no position to splice into without
 *   inventing one.
 *
 * A fix that turns out to change nothing once its tags are restored is dropped
 * too: it only matched mask characters, and letting it through would report a
 * byte-identical file as fixed and make `runRulesUntilStable` re-propose it on
 * every pass.
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
