// Micromark wrapper that builds the token tree.
// The event-to-tree code is adapted from markdownlint's lib/micromark-parse.mjs
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

// Used to parse block HTML again as inline content, which gives `htmlText` tokens
// for the tags inside it. markdownlint does the same. See `reparseHtmlFlow`.
const htmlFlowReparseExtension: Extension = { disable: { null: ['codeIndented', 'htmlFlow'] } };

function getEvents(content: string, extensions: Extension[]): Event[] {
  const parseContext = parse({ extensions });
  const chunks = preprocess()(content, undefined, true);
  return postprocess(parseContext.document().write(chunks));
}

/**
 * Builds a token tree from micromark events. `lineOffset` and `firstLineColumnOffset`
 * move positions in `content` to where it sits in the whole document.
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
        // Slice `content` directly. `context.sliceSerialize` can crash on nested
        // content such as lists inside list items.
        token.text = content.slice(mmToken.start.offset, mmToken.end.offset);
        token.endLine = adjustLine(mmToken.end.line);
        token.endColumn = adjustColumn(mmToken.end.line, mmToken.end.column);
      }
    }
  }
  return { children, flat };
}

// Whether the token is a valid CommonMark HTML comment. Copied from rules/token/helpers.ts,
// because the parser must not import from rules.
function isHtmlFlowComment(token: Token): boolean {
  const { text, type } = token;
  if (type === 'htmlFlow' && text.startsWith('<!--') && text.endsWith('-->')) {
    const comment = text.slice(4, -3);
    return !comment.startsWith('>') && !comment.startsWith('->') && !comment.endsWith('-');
  }
  return false;
}

/**
 * Parses the text of each block HTML (`htmlFlow`) token again as inline content, so
 * rules that look for `htmlText` tokens also see tags inside HTML blocks. The new
 * tokens become children of the original token and are added to `tree.flat`.
 */
function reparseHtmlFlow(tree: TokenTree): void {
  const htmlFlowTokens = tree.flat.filter(
    (token) => token.type === 'htmlFlow' && !isHtmlFlowComment(token)
  );
  for (const token of htmlFlowTokens) {
    const events = getEvents(token.text, [...baseExtensions, htmlFlowReparseExtension]);
    const reparsed = buildTree(events, token.text, token.startLine - 1, token.startColumn - 1);
    // Mark the new tokens `inHtmlFlow` so `filterByTypes` skips them by default.
    for (const descendant of reparsed.flat) descendant.inHtmlFlow = true;
    for (const child of reparsed.children) child.parent = token;
    token.children = reparsed.children;
    // Push one by one. Spreading a huge array into `push` overflows the call stack.
    for (const descendant of reparsed.flat) tree.flat.push(descendant);
  }
}

export interface ParseOptions {
  // Parse Markdoc tags. When off, the tree is the same as a plain markdown parse.
  markdoc?: boolean;
  // For markdown inside another document, such as an API `description`.
  // A leading `---` is then content, not front matter.
  embedded?: boolean;
}

export function parseMarkdown(content: string, options: ParseOptions = {}): TokenTree {
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
 * Returns the tokens of the given types. Tokens from inside block HTML (see
 * `reparseHtmlFlow`) are left out unless `includeHtmlFlow` is true.
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
