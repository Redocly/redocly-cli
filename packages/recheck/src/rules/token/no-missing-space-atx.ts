// Ported from markdownlint's lib/md018.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { addRangeToSet } from './helpers.js';

export const noMissingSpaceAtx: TokenRule = {
  name: 'no-missing-space-atx',
  tags: ['headings', 'atx', 'spaces'],
  fixable: true,
  defaults: {
    message: 'No space after hash on atx style heading',
  },
  check(ctx) {
    const ignoreBlockLineNumbers = new Set<number>();
    for (const token of ctx.tree.flat) {
      if (['codeFenced', 'codeIndented', 'htmlFlow'].includes(token.type)) {
        addRangeToSet(ignoreBlockLineNumbers, token.startLine, token.endLine);
      }
    }
    for (const [lineIndex, line] of ctx.lines.entries()) {
      if (
        !ignoreBlockLineNumbers.has(lineIndex + 1) &&
        /^#+[^# \t]/.test(line) &&
        !/#\s*$/.test(line) &&
        !line.startsWith('#️⃣')
      ) {
        const hashCount = (/^#+/.exec(line) ?? [''])[0].length;
        ctx.onError({
          line: lineIndex + 1,
          column: 1,
          context: line.trim(),
          fixInfo: {
            lineNumber: lineIndex + 1,
            editColumn: hashCount + 1,
            insertText: ' ',
          },
        });
      }
    }
  },
};
