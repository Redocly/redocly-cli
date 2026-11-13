import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md005.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';

export const listIndent: TokenRule = {
  name: 'list-indent',
  tags: ['bullet', 'ul', 'indentation'],
  fixable: true,
  defaults: {
    message: 'Inconsistent indentation for list items at the same level',
  },
  check(ctx) {
    for (const list of filterByTypes(ctx.tree, ['listOrdered', 'listUnordered'])) {
      const expectedIndent = list.startColumn - 1;
      let expectedEnd = 0;
      let endMatching = false;
      const listItemPrefixes = list.children.filter((token) => token.type === 'listItemPrefix');

      for (const listItemPrefix of listItemPrefixes) {
        const lineNumber = listItemPrefix.startLine;
        const actualIndent = listItemPrefix.startColumn - 1;

        if (list.type === 'listUnordered') {
          if (expectedIndent !== actualIndent) {
            // No fixInfo; MD007 (ul-indent) handles this scenario better.
            ctx.onError({
              line: lineNumber,
              column: 1,
              detail: `Expected: ${expectedIndent}; Actual: ${actualIndent}`,
            });
          }
        } else {
          const markerLength = listItemPrefix.text.trim().length;
          const actualEnd = listItemPrefix.startColumn + markerLength - 1;
          expectedEnd = expectedEnd || actualEnd;
          if (expectedIndent !== actualIndent || endMatching) {
            if (expectedEnd === actualEnd) {
              endMatching = true;
            } else {
              const detail = endMatching
                ? `Expected: (${expectedEnd}); Actual: (${actualEnd})`
                : `Expected: ${expectedIndent}; Actual: ${actualIndent}`;
              const expected = endMatching ? expectedEnd - markerLength : expectedIndent;
              const actual = endMatching ? actualEnd - markerLength : actualIndent;
              ctx.onError({
                line: lineNumber,
                column: 1,
                detail,
                fixInfo: {
                  lineNumber,
                  editColumn: Math.min(actual, expected) + 1,
                  deleteCount: Math.max(actual - expected, 0),
                  insertText: ''.padEnd(Math.max(expected - actual, 0)),
                },
              });
            }
          }
        }
      }
    }
  },
};
