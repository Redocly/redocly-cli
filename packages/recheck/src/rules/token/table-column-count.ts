import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md056.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import { getParentOfType } from './helpers.js';

const cellTypes = new Set(['tableData', 'tableDelimiter', 'tableHeader']);

export const tableColumnCount: TokenRule = {
  name: 'table-column-count',
  tags: ['table'],
  fixable: false,
  defaults: {
    message: 'Table column count',
  },
  check(ctx) {
    const rows = filterByTypes(ctx.tree, ['tableDelimiterRow', 'tableRow']);
    let expectedCount = 0;
    let currentTable: Token | null = null;
    for (const row of rows) {
      const table = getParentOfType(row, ['table']);
      if (currentTable !== table) {
        expectedCount = 0;
        currentTable = table;
      }
      const cells = row.children.filter((child) => cellTypes.has(child.type));
      const actualCount = cells.length;
      expectedCount ||= actualCount;
      if (actualCount === expectedCount) continue;
      let detail: string;
      let column: number;
      if (actualCount < expectedCount) {
        detail = 'Too few cells, row will be missing data';
        column = row.endColumn - 1;
      } else {
        detail = 'Too many cells, extra data will be missing';
        column = cells[expectedCount].startColumn;
      }
      ctx.onError({
        line: row.endLine,
        column,
        detail: `Expected: ${expectedCount}; Actual: ${actualCount}; ${detail}`,
      });
    }
  },
};
