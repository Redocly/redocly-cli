// Ported from markdownlint's lib/md027.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { getParentOfType } from './helpers.js';

const listTypes = ['listOrdered', 'listUnordered'];

export const noMultipleSpaceBlockquote: TokenRule = {
  name: 'no-multiple-space-blockquote',
  tags: ['blockquote', 'whitespace', 'indentation'],
  fixable: true,
  defaults: {
    message: 'Multiple spaces after blockquote symbol',
    listItems: true,
  },
  check(ctx) {
    const listItems = ctx.config.listItems;
    const includeListItems = listItems === undefined ? true : !!listItems;
    // With Markdoc parsing there is no `codeIndented` token (Markdoc has no indented code),
    // so track what CommonMark would read as an indented code block: a line indented four
    // or more columns past the blockquote marker that starts a block, and the indented
    // lines right after it. markdownlint skips those lines too.
    let inIndentedCode = false;
    for (const token of ctx.tree.flat) {
      const parent = token.parent;
      const siblings = parent ? parent.children : ctx.tree.children;
      const index = siblings.indexOf(token);
      if (token.type === 'blockQuotePrefix') {
        if (siblings[index + 1]?.type !== 'linePrefix') inIndentedCode = false;
        continue;
      }
      if (token.type !== 'linePrefix') continue;
      if (parent?.type === 'codeIndented') continue;
      if (siblings[index - 1]?.type !== 'blockQuotePrefix') continue;
      const { startColumn, startLine, endColumn, text } = token;
      if (ctx.markdoc && endColumn - startColumn >= 4) {
        if (parent?.type === 'blockQuote' || inIndentedCode) {
          inIndentedCode = true;
          continue;
        }
      }
      inIndentedCode = false;
      if (
        !includeListItems &&
        (listTypes.includes(siblings[index + 1]?.type ?? '') || getParentOfType(token, listTypes))
      ) {
        continue;
      }
      ctx.onError({
        line: startLine,
        column: startColumn,
        context: (ctx.lines[startLine - 1] ?? '').trim(),
        fixInfo: {
          lineNumber: startLine,
          editColumn: startColumn,
          deleteCount: text.length,
        },
      });
    }
  },
};
