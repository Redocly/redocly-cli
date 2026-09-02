import type { Token } from '../parser/types.js';

/** Half-open `[start, end)` character offsets into a segment's `content`. */
export interface TextRange {
  start: number;
  end: number;
}

export interface ScopedSegment {
  scope: string; // 'heading.h2', 'paragraph', 'code', 'table.cell', …
  /** For derived scopes (summary): the scope this segment was built from. */
  sourceScope?: string;
  content: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  tokens: Token[]; // backing tokens (≥1)
  /**
   * The verbatim source slice this segment covers, set only when `content` is
   * not that slice — that is, when a prose scope had markdoc tag spans blanked
   * out of it by `maskProse` in scopes/extractor.ts. Always the same length as
   * `content`, so an offset means the same thing in both.
   *
   * `content` is the prose view: what a rule should scan, split into words, or
   * measure. `sourceText ?? content` is the source view: what a rule should
   * quote in `Problem.text`, `Problem.match`, or a message. Quoting the masked
   * view instead shows the user a run of blanks where their tag is.
   */
  sourceText?: string;
  /**
   * The spans of `content` that masking blanked, when it did. Rules that
   * reject a match rather than rewrite text need these: a user-supplied regex
   * runs against `content`, and no mask character can stop an arbitrary
   * pattern (a negated class like `[^,]+`, or `\s+` against a blank mask) from
   * matching straight through a masked run and merging the text on either side
   * of a tag into one bogus match. Such a match has to be discarded after the
   * fact, by overlap — the same treatment inline code spans get, for the same
   * reason. `nonProseRanges` in rules/utils.ts bundles both sets.
   */
  maskedRanges?: TextRange[];
  metadata?: {
    headingLevel?: number;
    codeLanguage?: string;
    listDepth?: number;
  };
}
