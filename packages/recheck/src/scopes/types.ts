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
   * The original source text, set only when `content` differs from it, i.e. when markdoc tag
   * spans were masked. Same length as `content`. Use `content` to scan text and
   * `sourceText ?? content` to quote text in messages.
   */
  sourceText?: string;
  /**
   * The spans of `content` that were masked. A user regex can match straight through a masked
   * run, so such matches must be discarded afterwards. `nonProseRanges` in rules/utils.ts
   * combines these with inline code spans.
   */
  maskedRanges?: TextRange[];
  metadata?: {
    headingLevel?: number;
    codeLanguage?: string;
    listDepth?: number;
  };
}
