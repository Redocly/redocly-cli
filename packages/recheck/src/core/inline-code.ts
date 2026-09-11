/**
 * Matches one CommonMark inline code span: a backtick RUN of N backticks,
 * then content up to the NEXT run of exactly N backticks -- not merely "a
 * backtick ... a backtick" (a single-backtick-only regex treats a
 * multi-backtick span like ` ``configFile`` ` as two adjacent EMPTY
 * single-backtick pairs -- the two backticks at each end each look like
 * their own complete single-backtick pair -- leaving the real content
 * completely unrecognized in between). `(`+)` + backreference `\1`
 * requires the closing run to match the opening run's exact length;
 * `(?!`)` after `\1` rejects a run that is actually LONGER than N (e.g. a
 * stray extra backtick right after would mean this is not the true,
 * maximal closing run) -- this also correctly handles a span whose content
 * itself contains a SHORTER, unpaired backtick run (` ``code ` x`` `).
 * Content is restricted to `[^\n]` so a span can never cross a line;
 * callers only ever run this against single-line text.
 *
 * Shared by capitalization.ts (mask + restore, so `$`-style casing never
 * touches a code span's content), spelling.ts (mask, so a misspelling
 * check never flags identifier text), and metric.ts (strip, so readability
 * scoring never counts a code span's words/syllables) -- all three need
 * the identical CommonMark-correct span recognition, just applied
 * differently (mask-and-restore vs outright removal).
 */
export const BACKTICK_SPAN_RE = /(`+)[^\n]*?\1(?!`)/g;

/**
 * Placeholder character `maskInlineCode` masks spans with. \0 sits outside
 * every word tokenizer in the codebase (title-case.ts's WORD_RE,
 * capitalization.ts's sentence tokenizer, spelling.ts's word regex), so a
 * masked span is invisible to word-based scanning -- never matched, never
 * capitalized, never the first/last word.
 */
export const INLINE_CODE_MASK_CHAR = '\0';

/**
 * Masks every inline code span in `text` with a SAME-LENGTH run of
 * INLINE_CODE_MASK_CHAR. Length-preserving on purpose: every remaining
 * token's offset stays aligned with the original text, so match positions
 * computed against the masked string are valid source positions -- and
 * `restoreInlineCode` can splice the original spans back purely by
 * position.
 */
export function maskInlineCode(text: string): string {
  return text.replace(BACKTICK_SPAN_RE, (span) => INLINE_CODE_MASK_CHAR.repeat(span.length));
}

/**
 * Restores the inline code spans of `original` into `transformed`, a string
 * derived from `maskInlineCode(original)` by length-preserving transforms
 * only (e.g. case changes). Splices by position, not content search: the
 * span offsets found in `original` are still the span offsets in
 * `transformed` because masking and the intervening transforms never change
 * string length.
 */
export function restoreInlineCode(original: string, transformed: string): string {
  let result = '';
  let cursor = 0;
  for (const match of original.matchAll(BACKTICK_SPAN_RE)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    result += transformed.slice(cursor, start);
    result += original.slice(start, end); // restore the masked span verbatim
    cursor = end;
  }
  result += transformed.slice(cursor);
  return result;
}

/**
 * The half-open character ranges `[start, end)` of every inline code span
 * in `text`, using the same `BACKTICK_SPAN_RE` span recognition as
 * `maskInlineCode`/`restoreInlineCode` -- span recognition stays in exactly
 * one place.
 *
 * For rules that must REJECT a match inside code rather than rewrite text
 * (swap.ts, pattern.ts): those rules run an arbitrary user-supplied regex
 * (a `pattern` token, a `swap` key under `keysAreRegex`), and masking can
 * change what that regex matches. `maskInlineCode` substitutes a
 * same-length run of `\0` for a span's real characters -- and `\0` is not
 * whitespace, not a comma, not anything in particular. A negated class
 * like `[^\s,]+` treats that run as ordinary "not comma, not whitespace"
 * text and can match straight through it, merging text before and after
 * the span -- including whatever character (e.g. a comma) the class
 * exists to react to -- into one bogus match. A range check has no such
 * failure mode: the regex still runs against the genuine, unmodified text,
 * and a match is discarded only AFTER the fact, if its span overlaps a
 * code span. Use `inlineCodeRanges` + `overlapsAnyRange` for that; keep
 * `maskInlineCode` for rules that transform text in place and need a
 * length-preserving stand-in (capitalization.ts, spelling.ts).
 */
export function inlineCodeRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (const match of text.matchAll(BACKTICK_SPAN_RE)) {
    const start = match.index ?? 0;
    ranges.push({ start, end: start + match[0].length });
  }
  return ranges;
}

/**
 * Whether the half-open range `[start, end)` overlaps ANY of `ranges`.
 * Half-open, exclusive-end comparison on both sides: a match that only
 * touches a range's boundary -- ends exactly where the range starts, or
 * starts exactly where the range ends -- does NOT overlap.
 */
export function overlapsAnyRange(
  start: number,
  end: number,
  ranges: Array<{ start: number; end: number }>
): boolean {
  return ranges.some((range) => start < range.end && range.start < end);
}
