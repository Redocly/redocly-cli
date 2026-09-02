import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md058.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { getBlockQuotePrefixText, isBlankLine } from './helpers.js';

export const blanksAroundTables: TokenRule = {
  name: 'blanks-around-tables',
  tags: ['table'],
  fixable: true,
  defaults: {
    message: 'Tables should be surrounded by blank lines',
  },
  check(ctx) {
    const { lines } = ctx;

    for (const table of filterByTypes(ctx.tree, ['table'])) {
      // Look for a blank line above the table.
      const firstLineNumber = table.startLine;
      if (!isBlankLine(lines[firstLineNumber - 2])) {
        ctx.onError({
          line: firstLineNumber,
          context: (lines[firstLineNumber - 1] ?? '').trim(),
          fixInfo: {
            lineNumber: firstLineNumber,
            editColumn: 1,
            insertText: getBlockQuotePrefixText(ctx.tree, firstLineNumber),
          },
        });
      }

      // Look for a blank line below the table.
      const lastLineNumber = table.endLine;
      if (!isBlankLine(lines[lastLineNumber])) {
        ctx.onError({
          line: lastLineNumber,
          context: (lines[lastLineNumber - 1] ?? '').trim(),
          fixInfo: {
            lineNumber: lastLineNumber + 1,
            editColumn: 1,
            insertText: getBlockQuotePrefixText(ctx.tree, lastLineNumber),
          },
        });
      }
    }
  },
};
