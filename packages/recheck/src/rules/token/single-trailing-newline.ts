// Ported from markdownlint's lib/md047.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { isBlankLine } from './helpers.js';

export const singleTrailingNewline: TokenRule = {
  name: 'single-trailing-newline',
  tags: ['blank_lines'],
  fixable: true,
  defaults: {
    message: 'Files should end with a single newline character.',
  },
  check(ctx) {
    const lastLineNumber = ctx.lines.length;
    const lastLine = ctx.lines[lastLineNumber - 1] ?? '';
    if (!isBlankLine(lastLine)) {
      ctx.onError({
        line: lastLineNumber,
        column: lastLine.length,
        fixInfo: {
          lineNumber: lastLineNumber,
          editColumn: lastLine.length + 1,
          insertText: '\n',
        },
      });
    }
  },
};
