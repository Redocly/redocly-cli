import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md028.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';

const ignoreTypes = new Set(['lineEnding', 'listItemIndent', 'linePrefix']);

export const noBlanksBlockquote: TokenRule = {
  name: 'no-blanks-blockquote',
  tags: ['blockquote', 'whitespace'],
  fixable: false,
  defaults: {
    message: 'Blank line inside blockquote',
  },
  check(ctx) {
    for (const token of filterByTypes(ctx.tree, ['blockQuote'])) {
      const errorLineNumbers: number[] = [];
      const siblings = token.parent ? token.parent.children : ctx.tree.children;
      for (let i = siblings.indexOf(token) + 1; i < siblings.length; i++) {
        const sibling = siblings[i];
        const { startLine, type } = sibling;
        if (type === 'lineEndingBlank') {
          // Possible blank between blockquotes
          errorLineNumbers.push(startLine);
        } else if (ignoreTypes.has(type)) {
          // Ignore invisible formatting
        } else if (type === 'blockQuote') {
          // Blockquote followed by blockquote
          for (const lineNumber of errorLineNumbers) {
            ctx.onError({ line: lineNumber });
          }
          break;
        } else {
          // Blockquote not followed by blockquote
          break;
        }
      }
    }
  },
};
