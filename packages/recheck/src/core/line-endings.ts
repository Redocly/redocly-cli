// Ported from markdownlint's line-ending helpers (helpers/shared.cjs
// `newlineRe` and helpers/helpers.cjs `getPreferredLineEnding`;
// https://github.com/DavidAnson/markdownlint, MIT © David Anson).
//
// Everything that turns file content into per-line arrays (the runner's
// ctx.lines, applyFixesToContent's working lines) must split with
// `newLineRe`, never a bare '\n' — a CRLF file split on '\n' leaves a
// trailing '\r' on every line, which token rules then misread as trailing
// whitespace (and --fix would then mangle).
import * as os from 'node:os';

/**
 * Matches one line ending: CRLF (`\r\n`), lone CR (`\r`), or LF (`\n`).
 * Safe to share: `String.prototype.split` ignores the `g` flag/lastIndex,
 * and `String.prototype.match` with `g` always scans from index 0.
 */
export const newLineRe = /\r\n?|\n/g;

/**
 * Gets the file's most common line ending, falling back to the platform
 * default for content with no line endings at all — the exact semantics of
 * upstream's `getPreferredLineEnding(input, os)`. `applyFixesToContent`
 * joins fixed lines with this, so an all-CRLF file round-trips through
 * --fix still CRLF (and a mixed-endings file is normalized to its
 * majority ending, as markdownlint's `applyFixes` does).
 */
/**
 * Maps a 0-based character offset within `text` to a 1-based
 * (line, column) pair, treating CRLF, lone CR, and lone LF each as ONE
 * line ending — the single offset→position mapping every scope-rule
 * internals must use instead of hand-rolled `split('\n')` /
 * `lastIndexOf('\n')` arithmetic (which, on a CR-only file, keeps every
 * offset on line 1 with a column counted from the start of the text).
 *
 * An offset pointing INTO a CRLF pair (at its '\n') is reported as
 * column 1 of the following line; real callers pass match/sentence
 * offsets, which never start inside a line ending.
 */
export function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (const match of text.slice(0, offset).matchAll(newLineRe)) {
    line++;
    lineStart = match.index + match[0].length;
  }
  return { line, column: offset - lineStart + 1 };
}

export function getPreferredLineEnding(input: string): string {
  let cr = 0;
  let lf = 0;
  let crlf = 0;
  const endings = input.match(newLineRe) ?? [];
  for (const ending of endings) {
    if (ending === '\r') cr++;
    else if (ending === '\n') lf++;
    else crlf++;
  }
  if (!cr && !lf && !crlf) return os.EOL;
  if (lf >= crlf && lf >= cr) return '\n';
  return crlf >= cr ? '\r\n' : '\r';
}
