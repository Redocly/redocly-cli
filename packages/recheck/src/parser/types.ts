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
  // True for tokens produced by reparsing an `htmlFlow` (block HTML)
  // token's own text as inline content (see parser/index.ts's
  // `reparseHtmlFlow`) -- i.e. synthetic descendants that don't come from
  // the document's normal top-level tokenization. Mirrors upstream
  // markdownlint's `htmlFlowSymbol` marker (helpers/shared.cjs), which its
  // own `filterByTypes(tokens, types, htmlFlow)` helper uses to exclude
  // this content by default (see parser/index.ts's `filterByTypes`) --
  // most rules only care about genuinely top-level/inline tokens, and
  // without this distinction, e.g. a code span's backticks inside a
  // `<details>` block would spuriously match a plain `filterByTypes(tree,
  // ['codeText'])` scan the same as a real inline code span would.
  // Undefined (falsy) for every normal, non-reparsed token.
  inHtmlFlow?: boolean;
  // Set only on `markdocTag` tokens: the kind `parseMarkdocSpan` classified
  // the span's text as, or `'malformed'`. Undefined for every other token, and
  // moot when markdoc parsing is off, since no `markdocTag` tokens exist then.
  markdocKind?: MarkdocTagKind | 'malformed';
}

export interface TokenTree {
  children: Token[]; // top-level tokens in document order
  flat: Token[]; // depth-first flattened list
}
