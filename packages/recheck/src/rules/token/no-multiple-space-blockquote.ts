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
    for (const token of ctx.tree.flat) {
      if (token.type !== 'linePrefix') continue;
      const parent = token.parent;
      const codeIndented = parent?.type === 'codeIndented';
      const siblings = parent ? parent.children : ctx.tree.children;
      const index = siblings.indexOf(token);
      if (codeIndented) continue;
      if (siblings[index - 1]?.type !== 'blockQuotePrefix') continue;
      if (
        !includeListItems &&
        (listTypes.includes(siblings[index + 1]?.type ?? '') || getParentOfType(token, listTypes))
      ) {
        continue;
      }
      const { startColumn, startLine, text } = token;
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
