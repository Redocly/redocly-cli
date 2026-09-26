import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md030.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';

export const listMarkerSpace: TokenRule = {
  name: 'list-marker-space',
  tags: ['ol', 'ul', 'whitespace'],
  fixable: true,
  defaults: {
    message: 'Spaces after list markers',
    ulSingle: 1,
    olSingle: 1,
    ulMulti: 1,
    olMulti: 1,
  },
  check(ctx) {
    const ulSingle = Number(ctx.config.ulSingle ?? 1);
    const olSingle = Number(ctx.config.olSingle ?? 1);
    const ulMulti = Number(ctx.config.ulMulti ?? 1);
    const olMulti = Number(ctx.config.olMulti ?? 1);

    for (const list of filterByTypes(ctx.tree, ['listOrdered', 'listUnordered'])) {
      const ordered = list.type === 'listOrdered';
      const listItemPrefixes = list.children.filter((token) => token.type === 'listItemPrefix');
      const allSingleLine = list.endLine - list.startLine + 1 === listItemPrefixes.length;
      const expectedSpaces = ordered
        ? allSingleLine
          ? olSingle
          : olMulti
        : allSingleLine
          ? ulSingle
          : ulMulti;

      for (const listItemPrefix of listItemPrefixes) {
        const listItemPrefixWhitespaces = listItemPrefix.children.filter(
          (token) => token.type === 'listItemPrefixWhitespace'
        );
        for (const listItemPrefixWhitespace of listItemPrefixWhitespaces) {
          const { endColumn, startColumn, startLine } = listItemPrefixWhitespace;
          const actualSpaces = endColumn - startColumn;
          if (expectedSpaces !== actualSpaces) {
            ctx.onError({
              line: startLine,
              column: startColumn,
              detail: `Expected: ${expectedSpaces}; Actual: ${actualSpaces}`,
              fixInfo: {
                lineNumber: startLine,
                editColumn: startColumn,
                deleteCount: actualSpaces,
                insertText: ''.padEnd(expectedSpaces),
              },
            });
          }
        }
      }
    }
  },
};
