import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md007.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import { getParentOfType } from './helpers.js';

const unorderedListTypes = ['blockQuotePrefix', 'listItemPrefix', 'listUnordered'];
const unorderedParentTypes = ['blockQuote', 'listOrdered', 'listUnordered'];

export const ulIndent: TokenRule = {
  name: 'ul-indent',
  tags: ['bullet', 'ul', 'indentation'],
  fixable: true,
  defaults: {
    message: 'Unordered list indentation',
    indent: 2,
    startIndented: false,
    startIndent: 2,
  },
  // oxlint-disable-next-line sonarjs/cognitive-complexity -- ported from the source engine, written and reviewed against that repo's threshold of 100 (this repo's default is 30); needs a dedicated refactor or a per-package override, not a same-task rewrite of correctness-critical rule logic.
  check(ctx) {
    const indent = Number(ctx.config.indent ?? 2);
    const startIndented = !!ctx.config.startIndented;
    const startIndent = Number(ctx.config.startIndent ?? indent);
    const unorderedListNesting = new Map<Token, number>();
    let lastBlockQuotePrefix: Token | null = null;

    for (const token of filterByTypes(ctx.tree, unorderedListTypes)) {
      const { parent, startColumn, startLine, type } = token;
      if (type === 'blockQuotePrefix') {
        lastBlockQuotePrefix = token;
      } else if (type === 'listUnordered') {
        let nesting = 0;
        let current: Token | null = token;
        for (;;) {
          current = getParentOfType(current, unorderedParentTypes);
          if (!current) break;
          if (current.type === 'listUnordered') {
            nesting++;
            continue;
          } else if (current.type === 'listOrdered') {
            nesting = -1;
          }
          break;
        }
        if (nesting >= 0) {
          unorderedListNesting.set(token, nesting);
        }
      } else {
        // listItemPrefix
        const nesting = parent ? unorderedListNesting.get(parent) : undefined;
        if (nesting !== undefined) {
          const baseIndent = getParentOfType(token, ['gfmFootnoteDefinition']) ? 4 : 0;
          const expectedIndent = baseIndent + (startIndented ? startIndent : 0) + nesting * indent;
          const blockQuoteAdjustment =
            lastBlockQuotePrefix?.endLine === startLine ? lastBlockQuotePrefix.endColumn - 1 : 0;
          const actualIndent = startColumn - 1 - blockQuoteAdjustment;

          if (expectedIndent !== actualIndent) {
            ctx.onError({
              line: startLine,
              column: 1,
              detail: `Expected: ${expectedIndent}; Actual: ${actualIndent}`,
              fixInfo: {
                lineNumber: startLine,
                editColumn: startColumn - actualIndent,
                deleteCount: Math.max(actualIndent - expectedIndent, 0),
                insertText: ''.padEnd(Math.max(expectedIndent - actualIndent, 0)),
              },
            });
          }
        }
      }
    }
  },
};
