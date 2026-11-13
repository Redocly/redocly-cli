/**
 * Matches one inline code span: a run of N backticks, then text up to the next run of exactly N
 * backticks. It stays on one line, so use it on single-line text.
 */
export const BACKTICK_SPAN_RE = /(`+)[^\n]*?\1(?!`)/g;

/** The character that `maskInlineCode` uses. Word tokenizers never match it. */
export const INLINE_CODE_MASK_CHAR = '\0';

/**
 * Replaces each inline code span with the same number of `INLINE_CODE_MASK_CHAR`. The length stays
 * the same, so positions in the masked text are valid in the original.
 */
export function maskInlineCode(text: string): string {
  return text.replace(BACKTICK_SPAN_RE, (span) => INLINE_CODE_MASK_CHAR.repeat(span.length));
}

/**
 * Puts the code spans of `original` back into `transformed`, a masked copy that was changed
 * without changing its length (for example, case changes).
 */
export function restoreInlineCode(original: string, transformed: string): string {
  let result = '';
  let cursor = 0;
  for (const match of original.matchAll(BACKTICK_SPAN_RE)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    result += transformed.slice(cursor, start);
    result += original.slice(start, end);
    cursor = end;
  }
  result += transformed.slice(cursor);
  return result;
}

/**
 * The `[start, end)` ranges of the inline code spans in `text`.
 *
 * Rules that run a user regex (`swap`, `pattern`) use these ranges to drop matches inside code.
 * Masking would not work for them, because the mask characters can change what the regex matches.
 */
export function inlineCodeRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (const match of text.matchAll(BACKTICK_SPAN_RE)) {
    const start = match.index ?? 0;
    ranges.push({ start, end: start + match[0].length });
  }
  return ranges;
}

/** Whether `[start, end)` overlaps any of `ranges`. Touching at an end does not count. */
export function overlapsAnyRange(
  start: number,
  end: number,
  ranges: Array<{ start: number; end: number }>
): boolean {
  return ranges.some((range) => start < range.end && range.start < end);
}
