// Ported from markdownlint's lib/md060.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import stringWidth from 'string-width';

import { filterByTypes } from '../../parser/index.js';
import type { Token } from '../../parser/types.js';
import type { TokenRule, TokenRuleOnErrorInfo } from '../types.js';
import { filterByPredicate } from './helpers.js';

interface Column {
  actual: number;
  effective: number;
}

/**
 * Gets a list of table cell divider columns for a row. Upstream calls
 * `filterByTypes(row.children, ["tableCellDivider"])`, but with a plain
 * (non-flat-cached) array upstream's `filterByTypes` falls back to a
 * *recursive* descendant scan (see `helpers/micromark-helpers.cjs`'s
 * `filterByTypes`'s `flatTokensSymbol` check) -- `tableCellDivider` tokens
 * are nested several levels under a row's `tableHeader`/`tableData`/
 * `tableDelimiter` cell children, not direct children of the row itself
 * (confirmed via a tree dump), so this must use the recursive
 * `filterByPredicate` helper rather than a shallow `.filter(...)`.
 */
function getTableDividerColumns(lines: readonly string[], row: Token): Column[] {
  return filterByPredicate(row.children, (token) => token.type === 'tableCellDivider').map(
    (divider) => ({
      actual: divider.startColumn,
      effective: stringWidth((lines[row.startLine - 1] ?? '').slice(0, divider.startColumn - 1)),
    })
  );
}

/**
 * Checks the specified table rows for consistency with the "aligned" style:
 * every row's divider columns (by effective/visual width) must be a subset
 * of the header row's divider columns.
 */
function checkStyleAligned(
  lines: readonly string[],
  rows: readonly Token[],
  detail: string
): TokenRuleOnErrorInfo[] {
  const errorInfos: TokenRuleOnErrorInfo[] = [];
  const headerRow = rows[0];
  const headerDividerColumns = getTableDividerColumns(lines, headerRow);
  for (const row of rows.slice(1)) {
    const remainingHeaderDividerColumns = new Set(headerDividerColumns.map((c) => c.effective));
    const rowDividerColumns = getTableDividerColumns(lines, row);
    for (const dividerColumn of rowDividerColumns) {
      if (
        remainingHeaderDividerColumns.size > 0 &&
        !remainingHeaderDividerColumns.delete(dividerColumn.effective)
      ) {
        errorInfos.push({ line: row.startLine, column: dividerColumn.actual, detail });
      }
    }
  }
  return errorInfos;
}

export const tableColumnStyle: TokenRule = {
  name: 'table-column-style',
  tags: ['table'],
  fixable: true,
  defaults: {
    message: 'Table column style',
    style: 'any',
    alignedDelimiter: false,
  },
  // oxlint-disable-next-line sonarjs/cognitive-complexity -- ported from the source engine, written and reviewed against that repo's threshold of 100 (this repo's default is 30); needs a dedicated refactor or a per-package override, not a same-task rewrite of correctness-critical rule logic.
  check(ctx) {
    const style = String(ctx.config.style || 'any');
    const styleAlignedAllowed = style === 'any' || style === 'aligned';
    const styleCompactAllowed = style === 'any' || style === 'compact';
    const styleTightAllowed = style === 'any' || style === 'tight';
    const alignedDelimiter = !!ctx.config.alignedDelimiter;
    const { lines } = ctx;

    for (const table of filterByTypes(ctx.tree, ['table'])) {
      // Upstream calls `filterByTypes(table.children, [...])`, which (per
      // the same non-flat-cached fallback noted on `getTableDividerColumns`
      // above) recursively descends through `tableHead`/`tableBody` to find
      // row tokens, rather than only scanning `table`'s direct children.
      const rows = filterByPredicate(
        table.children,
        (token) => token.type === 'tableDelimiterRow' || token.type === 'tableRow'
      );

      const errorsIfAligned: TokenRuleOnErrorInfo[] = styleAlignedAllowed
        ? checkStyleAligned(
            lines,
            rows,
            'Table pipe does not align with header for style "aligned"'
          )
        : [];

      const errorsIfCompact: TokenRuleOnErrorInfo[] = [];
      const errorsIfTight: TokenRuleOnErrorInfo[] = [];
      if (
        (styleCompactAllowed || styleTightAllowed) &&
        !(styleAlignedAllowed && errorsIfAligned.length === 0)
      ) {
        if (alignedDelimiter) {
          const errorInfos = checkStyleAligned(
            lines,
            rows.slice(0, 2),
            'Table pipe does not align with header for option "aligned_delimiter"'
          );
          errorsIfCompact.push(...errorInfos);
          errorsIfTight.push(...errorInfos);
        }
        for (const row of rows) {
          const tokensOfInterest = filterByPredicate(row.children, (token) =>
            ['tableCellDivider', 'tableContent', 'whitespace'].includes(token.type)
          );
          for (let i = 0; i < tokensOfInterest.length; i++) {
            const { startColumn, startLine, type } = tokensOfInterest[i];
            if (type !== 'tableCellDivider') continue;
            const previous = tokensOfInterest[i - 1];
            if (previous) {
              if (previous.type === 'whitespace') {
                if (previous.text.length !== 1) {
                  errorsIfCompact.push({
                    line: startLine,
                    column: startColumn,
                    detail: 'Table pipe has extra space to the left for style "compact"',
                    fixInfo: {
                      lineNumber: startLine,
                      editColumn: previous.startColumn,
                      deleteCount: previous.text.length - 1,
                    },
                  });
                }
                errorsIfTight.push({
                  line: startLine,
                  column: startColumn,
                  detail: 'Table pipe has space to the left for style "tight"',
                  fixInfo: {
                    lineNumber: startLine,
                    editColumn: previous.startColumn,
                    deleteCount: previous.text.length,
                  },
                });
              } else {
                errorsIfCompact.push({
                  line: startLine,
                  column: startColumn,
                  detail: 'Table pipe is missing space to the left for style "compact"',
                  fixInfo: {
                    lineNumber: startLine,
                    editColumn: previous.endColumn,
                    insertText: ' ',
                  },
                });
              }
            }
            const next = tokensOfInterest[i + 1];
            if (next) {
              if (next.type === 'whitespace') {
                if (next.endColumn !== row.endColumn) {
                  if (next.text.length !== 1) {
                    errorsIfCompact.push({
                      line: startLine,
                      column: startColumn,
                      detail: 'Table pipe has extra space to the right for style "compact"',
                      fixInfo: {
                        lineNumber: startLine,
                        editColumn: next.startColumn,
                        deleteCount: next.text.length - 1,
                      },
                    });
                  }
                  errorsIfTight.push({
                    line: startLine,
                    column: startColumn,
                    detail: 'Table pipe has space to the right for style "tight"',
                    fixInfo: {
                      lineNumber: startLine,
                      editColumn: next.startColumn,
                      deleteCount: next.text.length,
                    },
                  });
                }
              } else {
                errorsIfCompact.push({
                  line: startLine,
                  column: startColumn,
                  detail: 'Table pipe is missing space to the right for style "compact"',
                  fixInfo: { lineNumber: startLine, editColumn: next.startColumn, insertText: ' ' },
                });
              }
            }
          }
        }
      }

      // Report whichever (allowed) style has the fewest issues.
      let errorInfos = errorsIfAligned;
      if (
        styleCompactAllowed &&
        (errorsIfCompact.length < errorInfos.length || !styleAlignedAllowed)
      ) {
        errorInfos = errorsIfCompact;
      }
      if (
        styleTightAllowed &&
        (errorsIfTight.length < errorInfos.length || (!styleAlignedAllowed && !styleCompactAllowed))
      ) {
        errorInfos = errorsIfTight;
      }
      for (const errorInfo of errorInfos) {
        ctx.onError(errorInfo);
      }
    }
  },
};
