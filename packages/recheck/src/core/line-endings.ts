// Based on markdownlint's `newlineRe` and `getPreferredLineEnding` (MIT, David Anson).
// Always split lines with `newLineRe`, never '\n', or CRLF files keep a trailing '\r' on every line.
import * as os from 'node:os';

/** Matches one line ending: CRLF, lone CR or LF. */
export const newLineRe = /\r\n?|\n/g;

/**
 * Maps a 0-based offset in `text` to a 1-based line and column. CRLF, CR and LF each count as one
 * line ending. An offset at the `\n` of a CRLF is reported as column 1 of the next line.
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

/** Returns the most common line ending in `input`, or the platform default if there is none. */
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
