// Ported from markdownlint's `applyFix`/`applyFixes` (lib/markdownlint.mjs;
// https://github.com/DavidAnson/markdownlint, MIT © David Anson), with one
// recheck extension: `deleteCount: -1` WITH an `insertText` replaces the
// whole line (possibly with several lines — '\n's in insertText become the
// file's own line ending) instead of upstream's delete-only semantics; see
// the `Fix` type in ../types/problems.ts.
//
// Mirrored upstream semantics:
// - lines are split with `newLineRe` (/\r\n?|\n/), never a bare '\n';
// - fixed content is rejoined with the file's preferred line ending
//   (`getPreferredLineEnding`), so CRLF files stay CRLF through --fix;
// - fixes are sorted bottom-to-top, line-deletes last within a line,
//   right-to-left, longer-insert first; exact duplicates are dropped;
//   an insert-only and a delete-only fix at the same position collapse
//   into one replacement; remaining overlaps on a line are skipped.
//
// On top of upstream: every input fix is classified into `applied` or
// `skipped`, so callers can report what actually changed the file instead
// of every proposal. A dropped duplicate or a collapse-absorbed fix counts
// as applied when its surviving twin/merge landed — its intent is in the
// content even though it produced no edit of its own.
import type { Fix } from '../types/index.js';
import { newLineRe, getPreferredLineEnding } from './line-endings.js';

export interface ApplyFixesResult {
  /** The fixed content, rejoined with the file's preferred line ending. */
  content: string;
  /** Input fixes whose edit (or an identical/merged twin's) landed. */
  applied: Fix[];
  /** Input fixes dropped by overlap resolution or out-of-range lines. */
  skipped: Fix[];
}

interface NormalizedFix {
  lineNumber: number;
  editColumn: number;
  deleteCount: number;
  // Kept undefined-able (unlike upstream's normalization to ''): for
  // deleteCount -1, undefined means "delete the line" while a string means
  // "replace the line" (the recheck extension described above).
  insertText: string | undefined;
  // Original Fix objects this record stands for — the fix itself plus any
  // dropped duplicates / collapse-absorbed fixes folded into it.
  sources: Fix[];
}

function applyFix(line: string | null, fix: NormalizedFix, lineEnding: string): string | null {
  if (fix.deleteCount === -1) {
    return fix.insertText === undefined ? null : fix.insertText.replace(/\n/g, lineEnding);
  }
  const editIndex = fix.editColumn - 1;
  const text = line ?? '';
  return (
    text.slice(0, editIndex) +
    (fix.insertText ?? '').replace(/\n/g, lineEnding) +
    text.slice(editIndex + fix.deleteCount)
  );
}

// Duplicate detection: upstream compares insertText after normalizing to
// ''. recheck keeps the ''-vs-undefined distinction for deleteCount -1
// (delete line vs replace with empty line), so only compare normalized
// when neither side is a whole-line fix.
function sameFix(a: NormalizedFix, b: NormalizedFix): boolean {
  if (a.lineNumber !== b.lineNumber || a.editColumn !== b.editColumn) return false;
  if (a.deleteCount !== b.deleteCount) return false;
  return a.deleteCount === -1
    ? a.insertText === b.insertText
    : (a.insertText ?? '') === (b.insertText ?? '');
}

export function applyFixesToContent(content: string, fixes: Fix[]): ApplyFixesResult {
  const lineEnding = getPreferredLineEnding(content);
  const lines: (string | null)[] = content.split(newLineRe);

  let fixInfos: NormalizedFix[] = fixes.map((fix) => ({
    lineNumber: fix.lineNumber,
    editColumn: fix.editColumn || 1,
    deleteCount: fix.deleteCount || 0,
    insertText: fix.insertText,
    sources: [fix],
  }));

  // Sort bottom-to-top, line-deletes last, right-to-left, long-to-short.
  fixInfos.sort((a, b) => {
    const aDeletingLine = a.deleteCount === -1;
    const bDeletingLine = b.deleteCount === -1;
    return (
      b.lineNumber - a.lineNumber ||
      (aDeletingLine ? 1 : bDeletingLine ? -1 : 0) ||
      b.editColumn - a.editColumn ||
      (b.insertText ?? '').length - (a.insertText ?? '').length
    );
  });

  // Remove duplicate entries (needed for the following collapse step),
  // folding each dropped duplicate's sources into the record it duplicates.
  let lastKept: NormalizedFix | undefined;
  fixInfos = fixInfos.filter((fixInfo) => {
    if (lastKept && sameFix(fixInfo, lastKept)) {
      lastKept.sources.push(...fixInfo.sources);
      return false;
    }
    lastKept = fixInfo;
    return true;
  });

  // Collapse insert/no-delete and no-insert/delete for same line/column
  // into a single replacement.
  let previous: NormalizedFix | undefined;
  for (const fixInfo of fixInfos) {
    if (
      previous &&
      fixInfo.lineNumber === previous.lineNumber &&
      fixInfo.editColumn === previous.editColumn &&
      !fixInfo.insertText &&
      fixInfo.deleteCount > 0 &&
      previous.insertText &&
      !previous.deleteCount
    ) {
      fixInfo.insertText = previous.insertText;
      fixInfo.sources.push(...previous.sources);
      previous.lineNumber = 0;
    }
    previous = fixInfo;
  }
  fixInfos = fixInfos.filter((fixInfo) => fixInfo.lineNumber);

  // Apply all remaining fixes, skipping any that overlap the previous fix
  // on the same line (upstream compares against the previous fix in sort
  // order, applied or not — mirrored here).
  const appliedSources = new Set<Fix>();
  let lastLineIndex = -1;
  let lastEditIndex = -1;
  for (const fixInfo of fixInfos) {
    const { deleteCount } = fixInfo;
    const lineIndex = fixInfo.lineNumber - 1;
    const editIndex = fixInfo.editColumn - 1;
    const inBounds = lineIndex >= 0 && lineIndex < lines.length;
    if (
      inBounds &&
      (lineIndex !== lastLineIndex ||
        deleteCount === -1 ||
        editIndex + deleteCount <= lastEditIndex - (deleteCount > 0 ? 0 : 1))
    ) {
      lines[lineIndex] = applyFix(lines[lineIndex], fixInfo, lineEnding);
      for (const source of fixInfo.sources) appliedSources.add(source);
    }
    lastLineIndex = lineIndex;
    lastEditIndex = editIndex;
  }

  return {
    content: lines.filter((line) => line !== null).join(lineEnding),
    applied: fixes.filter((fix) => appliedSources.has(fix)),
    skipped: fixes.filter((fix) => !appliedSources.has(fix)),
  };
}
