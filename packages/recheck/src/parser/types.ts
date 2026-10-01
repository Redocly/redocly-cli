import type { MarkdocTagKind } from './markdoc/span.js';

export interface Token {
  type: string; // micromark token type, e.g. 'atxHeading'
  startLine: number;
  startColumn: number; // 1-based
  endLine: number;
  endColumn: number; // 1-based, exclusive column
  text: string; // source text of the token
  children: Token[];
  parent: Token | null;
  // True for tokens created by parsing the text of a block HTML token as inline
  // content. `filterByTypes` skips these by default.
  inHtmlFlow?: boolean;
  // Only set on `markdocTag` tokens: what kind of span this is.
  markdocKind?: MarkdocTagKind | 'malformed';
}

export interface TokenTree {
  children: Token[]; // top-level tokens in document order
  flat: Token[]; // depth-first flattened list
}
