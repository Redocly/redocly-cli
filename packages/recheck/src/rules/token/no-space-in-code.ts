import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md038.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { getDescendantsByType } from './helpers.js';

export const noSpaceInCode: TokenRule = {
  name: 'no-space-in-code',
  tags: ['whitespace', 'code'],
  fixable: true,
  defaults: {
    message: 'Spaces inside code span elements',
  },
  check(ctx) {
    for (const codeText of filterByTypes(ctx.tree, ['codeText'])) {
      const datas = getDescendantsByType(codeText, ['codeTextData']);
      if (datas.length === 0) continue;
      const paddings = getDescendantsByType(codeText, ['codeTextPadding']);

      // Check for extra space at start of code.
      const startPadding = paddings[0];
      const startData = datas[0];
      const startMatch = /^(\s+)(\S)/.exec(startData.text);
      const startWhitespace = startMatch?.[1] ?? '';
      const startNext = startMatch?.[2] ?? '';
      const startBacktick = startNext === '`';
      const startCount = startWhitespace.length - (startBacktick && !startPadding ? 1 : 0);
      const startSpaces = startCount > 0;

      // Check for extra space at end of code.
      const endPadding = paddings[paddings.length - 1];
      const endData = datas[datas.length - 1];
      const endMatch = /(\S)(\s+)$/.exec(endData.text);
      const endPrev = endMatch?.[1] ?? '';
      const endWhitespace = endMatch?.[2] ?? '';
      const endBacktick = endPrev === '`';
      const endCount = endWhitespace.length - (endBacktick && !endPadding ? 1 : 0);
      const endSpaces = endCount > 0;

      // Check if safe to remove 1-space padding.
      const removePadding =
        startSpaces &&
        endSpaces &&
        Boolean(startPadding) &&
        Boolean(endPadding) &&
        !startBacktick &&
        !endBacktick;
      const context = codeText.text;

      // If extra space at start, report violation.
      if (startSpaces) {
        const startColumn = (removePadding ? startPadding : startData).startColumn;
        const length = startCount + (removePadding ? startPadding.text.length : 0);
        ctx.onError({
          line: startData.startLine,
          column: startColumn,
          context,
          fixInfo: {
            lineNumber: startData.startLine,
            editColumn: startColumn,
            deleteCount: length,
          },
        });
      }

      // If extra space at end, report violation.
      if (endSpaces) {
        const endColumn = (removePadding ? endPadding : endData).endColumn;
        const length = endCount + (removePadding ? endPadding.text.length : 0);
        ctx.onError({
          line: endData.endLine,
          column: endColumn - length,
          context,
          fixInfo: {
            lineNumber: endData.endLine,
            editColumn: endColumn - length,
            deleteCount: length,
          },
        });
      }
    }
  },
};
