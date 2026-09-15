import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md055.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';

const whitespaceTypes = new Set(['linePrefix', 'whitespace']);
const ignoreWhitespace = (tokens: Token[]): Token[] =>
  tokens.filter((token) => !whitespaceTypes.has(token.type));

export const tablePipeStyle: TokenRule = {
  name: 'table-pipe-style',
  tags: ['table'],
  fixable: false,
  defaults: {
    message: 'Table pipe style',
    style: 'consistent',
  },
  check(ctx) {
    let expectedStyle = String(ctx.config.style || 'consistent');
    let expectedLeadingPipe =
      expectedStyle !== 'no_leading_or_trailing' && expectedStyle !== 'trailing_only';
    let expectedTrailingPipe =
      expectedStyle !== 'no_leading_or_trailing' && expectedStyle !== 'leading_only';
    const rows = filterByTypes(ctx.tree, ['tableDelimiterRow', 'tableRow']);
    for (const row of rows) {
      const firstCell = row.children[0];
      const leadingToken = ignoreWhitespace(firstCell.children)[0];
      const actualLeadingPipe = leadingToken.type === 'tableCellDivider';
      const lastCell = row.children[row.children.length - 1];
      const trailingCandidates = ignoreWhitespace(lastCell.children);
      const trailingToken = trailingCandidates[trailingCandidates.length - 1];
      const actualTrailingPipe = trailingToken.type === 'tableCellDivider';
      const actualStyle = actualLeadingPipe
        ? actualTrailingPipe
          ? 'leading_and_trailing'
          : 'leading_only'
        : actualTrailingPipe
          ? 'trailing_only'
          : 'no_leading_or_trailing';
      if (expectedStyle === 'consistent') {
        expectedStyle = actualStyle;
        expectedLeadingPipe = actualLeadingPipe;
        expectedTrailingPipe = actualTrailingPipe;
      }
      if (actualLeadingPipe !== expectedLeadingPipe) {
        ctx.onError({
          line: firstCell.startLine,
          column: row.startColumn,
          detail: `Expected: ${expectedStyle}; Actual: ${actualStyle}; ${
            expectedLeadingPipe ? 'Missing' : 'Unexpected'
          } leading pipe`,
        });
      }
      if (actualTrailingPipe !== expectedTrailingPipe) {
        ctx.onError({
          line: lastCell.endLine,
          column: lastCell.endColumn - 1,
          detail: `Expected: ${expectedStyle}; Actual: ${actualStyle}; ${
            expectedTrailingPipe ? 'Missing' : 'Unexpected'
          } trailing pipe`,
        });
      }
    }
  },
};
