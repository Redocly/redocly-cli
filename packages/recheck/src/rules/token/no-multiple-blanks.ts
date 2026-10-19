import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md012.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { addRangeToSet } from './helpers.js';

export const noMultipleBlanks: TokenRule = {
  name: 'no-multiple-blanks',
  tags: ['whitespace', 'blank_lines'],
  fixable: true,
  defaults: {
    message: 'Multiple consecutive blank lines',
    maximum: 1,
  },
  check(ctx) {
    const maximum = Number(ctx.config.maximum || 1);
    const { lines } = ctx;
    const codeBlockLineNumbers = new Set<number>();
    for (const codeBlock of filterByTypes(ctx.tree, ['codeFenced', 'codeIndented'])) {
      addRangeToSet(codeBlockLineNumbers, codeBlock.startLine, codeBlock.endLine);
    }
    let count = 0;
    for (const [lineIndex, line] of lines.entries()) {
      const inCode = codeBlockLineNumbers.has(lineIndex + 1);
      count = inCode || line.trim().length > 0 ? 0 : count + 1;
      if (maximum < count) {
        ctx.onError({
          line: lineIndex + 1,
          detail: `Expected: ${maximum}; Actual: ${count}`,
          fixInfo: {
            lineNumber: lineIndex + 1,
            deleteCount: -1,
          },
        });
      }
    }
  },
};
