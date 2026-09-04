// Micromark wrapper producing Recheck's public TokenTree.
// Event-to-tree construction adapted from markdownlint's lib/micromark-parse.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import { parse, postprocess, preprocess } from 'micromark';
import { directive } from 'micromark-extension-directive';
import { frontmatter } from 'micromark-extension-frontmatter';
import { gfmAutolinkLiteral } from 'micromark-extension-gfm-autolink-literal';
import { gfmFootnote } from 'micromark-extension-gfm-footnote';
import { gfmTable } from 'micromark-extension-gfm-table';
import { math } from 'micromark-extension-math';
import type { Event, Extension } from 'micromark-util-types';

import { structureMarkdocTags } from './markdoc/structure.js';
import { markdocSyntax } from './markdoc/syntax.js';
import type { Token, TokenTree } from './types.js';

export type { Token, TokenTree } from './types.js';

const frontmatterExtension = frontmatter(['yaml']);
const baseExtensions = [
  directive(),
  gfmAutolinkLiteral(),
  gfmFootnote(),
  gfmTable(),
  math(),
  frontmatterExtension,
];

// Forces htmlFlow (block HTML) regions to be reparsed as if they were
// regular inline content -- disabling the `codeIndented`/`htmlFlow` block
// constructs makes micromark fall through to paragraph/inline tokenization
// for the same text, which is exactly what upstream markdownlint's own
// `micromark-parse.mjs` shim does (it disables the identical pair) to
// produce real `htmlText` tokens for tags inside HTML blocks. See
// `reparseHtmlFlow` below.
const htmlFlowReparseExtension: Extension = { disable: { null: ['codeIndented', 'htmlFlow'] } };

function getEvents(content: string, extensions: Extension[]): Event[] {
  const parseContext = parse({ extensions });
  const chunks = preprocess()(content, undefined, true);
  return postprocess(parseContext.document().write(chunks));
}

/**
 * Builds a Token tree from a flat micromark event list. `lineOffset` and
 * `firstLineColumnOffset` translate positions that are relative to
 * `content` (starting at line 1, column 1) into the surrounding
 * document's coordinate space -- used by `reparseHtmlFlow` below to splice
 * a reparsed `htmlFlow` block's tokens back in at their real position.
 * `content` itself must already be the exact document (or sub-region)
 * text so `start.offset`/`end.offset` slicing stays correct.
 */
function buildTree(
  events: Event[],
  content: string,
  lineOffset = 0,
  firstLineColumnOffset = 0
): TokenTree {
  const children: Token[] = [];
  const flat: Token[] = [];
  const stack: Token[] = [];
  const adjustLine = (line: number) => line + lineOffset;
  const adjustColumn = (line: number, column: number) =>
    line === 1 ? column + firstLineColumnOffset : column;
  for (const event of events) {
    const [kind, mmToken] = event;
    if (kind === 'enter') {
      const parent = stack[stack.length - 1] ?? null;
      const token: Token = {
        type: mmToken.type,
        startLine: adjustLine(mmToken.start.line),
        startColumn: adjustColumn(mmToken.start.line, mmToken.start.column),
        endLine: adjustLine(mmToken.end.line),
        endColumn: adjustColumn(mmToken.end.line, mmToken.end.column),
        text: '',
        children: [],
        parent,
      };
      (parent ? parent.children : children).push(token);
      flat.push(token);
      stack.push(token);
    } else {
      const token = stack.pop();
      if (token) {
        // Slice from the original content via absolute offsets rather than
        // `context.sliceSerialize`. Nested/subtokenized content (e.g. list
        // items containing sublists) can leave an exit event's `context`
        // pointing at a tokenizer buffer that no longer covers this token,
        // crashing `sliceSerialize`. `start.offset`/`end.offset` are stable
        // document-absolute positions, so slicing `content` directly avoids
        // depending on which context object emitted the event, matching
        // markdownlint's lib/micromark-parse.mjs `getText` helper (MIT).
        token.text = content.slice(mmToken.start.offset, mmToken.end.offset);
        token.endLine = adjustLine(mmToken.end.line);
        token.endColumn = adjustColumn(mmToken.end.line, mmToken.end.column);
      }
    }
  }
  return { children, flat };
}

/**
 * Returns true iff the token is an HTML comment (`<!-- ... -->`) that is
 * valid per the CommonMark spec. Duplicated (narrowly) from
 * rules/token/helpers.ts's `isHtmlFlowComment` rather than imported --
 * that module is rule-layer code that itself depends on parser types, and
 * this parser module must not depend back on the rules layer.
 */
function isHtmlFlowComment(token: Token): boolean {
  const { text, type } = token;
  if (type === 'htmlFlow' && text.startsWith('<!--') && text.endsWith('-->')) {
    const comment = text.slice(4, -3);
    return !comment.startsWith('>') && !comment.startsWith('->') && !comment.endsWith('-');
  }
  return false;
}

/**
 * Re-tokenizes every non-comment `htmlFlow` (block HTML) token's own text
 * as inline content, splicing the result in as that token's children (and
 * into `flat`) so rules that look for `htmlText` tokens (e.g. MD033
 * no-inline-html) see tags inside HTML blocks -- not just genuinely
 * inline HTML -- exactly like upstream markdownlint (see
 * `htmlFlowReparseExtension`'s doc comment). Mutates `tree.flat` in place;
 * `tree.children` already references the same token objects, so no
 * further mutation is needed there.
 *
 * A block like:
 *   <details>
 *   <summary>Text</summary>
 * is ONE `htmlFlow` token whose raw text spans both lines; reparsing it
 * with `codeIndented`/`htmlFlow` disabled naturally produces `htmlText`
 * tokens for `<details>`, `<summary>`, and `</summary>` as descendants,
 * which is what makes the fix work even when multiple tags/lines are
 * inside a single flow block.
 */
function reparseHtmlFlow(tree: TokenTree): void {
  const htmlFlowTokens = tree.flat.filter(
    (token) => token.type === 'htmlFlow' && !isHtmlFlowComment(token)
  );
  for (const token of htmlFlowTokens) {
    const events = getEvents(token.text, [...baseExtensions, htmlFlowReparseExtension]);
    const reparsed = buildTree(events, token.text, token.startLine - 1, token.startColumn - 1);
    // Re-parent every reparsed token onto the original htmlFlow token, mark
    // it `inHtmlFlow` (see Token's doc comment -- lets `filterByTypes`
    // exclude this synthetic content by default, matching upstream), and
    // add them all to the shared flat list. The htmlFlow token's OWN
    // top-level type/text/position are left untouched -- only its
    // (previously empty-of-inline-tags) children are replaced.
    for (const descendant of reparsed.flat) descendant.inHtmlFlow = true;
    for (const child of reparsed.children) child.parent = token;
    token.children = reparsed.children;
    // Push one-by-one: spreading an unbounded array as arguments overflows
    // the call stack on huge HTML blocks (tens of thousands of lines), and
    // this pass must never throw on a large document.
    for (const descendant of reparsed.flat) tree.flat.push(descendant);
  }
}

export interface ParseOptions {
  // Opt-in Markdoc tokenization. When off, the tree is byte-identical to a
  // parse that knows nothing about Markdoc, which the markdownlint-parity
  // profile relies on.
  markdoc?: boolean;
  // Embedded mode, for markdown that lives inside another document (an
  // API `description` field): a leading `---` is content, not front matter.
  embedded?: boolean;
}

export function parseMarkdown(content: string, options: ParseOptions = {}): TokenTree {
  // With the flag off, the extension list and the post-passes are identical to
  // a parse that knows nothing about Markdoc -- `markdocSyntax()` is never even
  // instantiated -- so the tree stays byte-identical by construction.
  const blockExtensions = options.embedded
    ? baseExtensions.filter((extension) => extension !== frontmatterExtension)
    : baseExtensions;
  const extensions = options.markdoc
    ? [...blockExtensions, markdocSyntax(content)]
    : blockExtensions;
  const events = getEvents(content, extensions);
  const tree = buildTree(events, content);
  reparseHtmlFlow(tree);
  if (options.markdoc) structureMarkdocTags(tree);
  return tree;
}

/**
 * Filters the tree's flat token list by type. By default, tokens produced
 * by reparsing an `htmlFlow` block (see `reparseHtmlFlow` above) are
 * EXCLUDED -- matching upstream markdownlint's own `filterByTypes(tokens,
 * types, htmlFlow)` helper, whose `htmlFlow` parameter defaults to falsy.
 * Pass `includeHtmlFlow: true` for rules that explicitly want to see
 * inside HTML blocks too (upstream's MD033/no-inline-html and
 * MD045/no-alt-text opt in this way; see their recheck ports for the same
 * opt-in).
 */
export function filterByTypes(
  tree: TokenTree,
  types: readonly string[],
  includeHtmlFlow = false
): Token[] {
  return tree.flat.filter(
    (token) => types.includes(token.type) && (includeHtmlFlow || !token.inHtmlFlow)
  );
}
