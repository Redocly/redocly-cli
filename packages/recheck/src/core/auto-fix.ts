// Based on markdownlint's `applyFix` and `applyFixes` (MIT, David Anson).
// One change: `deleteCount: -1` with an `insertText` replaces the whole line,
// where markdownlint only deletes it. See the `Fix` type in ../types/problems.ts.
//
// Fixes are sorted bottom to top and right to left, and fixes that overlap on a line are
// skipped. The result keeps the file's line ending, so CRLF files stay CRLF.
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
  // `undefined` with `deleteCount: -1` deletes the line, and a string replaces it.
  insertText: string | undefined;
  // The fixes this record stands for, including merged duplicates.
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

// `undefined` and `''` differ for whole-line fixes (delete vs replace with an empty line).
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

  // Bottom to top, then line deletes last, then right to left, then longest insert first.
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

  // Drop duplicates, keeping their sources on the surviving fix.
  let lastKept: NormalizedFix | undefined;
  fixInfos = fixInfos.filter((fixInfo) => {
    if (lastKept && sameFix(fixInfo, lastKept)) {
      lastKept.sources.push(...fixInfo.sources);
      return false;
    }
    lastKept = fixInfo;
    return true;
  });

  // Merge an insert-only and a delete-only fix at the same spot into one replacement.
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

  // Apply the rest. A fix that overlaps the previous one on the same line is skipped.
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
