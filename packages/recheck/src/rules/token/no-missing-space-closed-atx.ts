// Ported from markdownlint's lib/md020.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { addRangeToSet } from './helpers.js';

const closedAtxRe = /^(#+)([ \t]*)([^# \t\\]|[^# \t][^#]*?[^# \t\\])([ \t]*)((?:\\#)?)(#+)(\s*)$/;

export const noMissingSpaceClosedAtx: TokenRule = {
  name: 'no-missing-space-closed-atx',
  tags: ['headings', 'atx_closed', 'spaces'],
  fixable: true,
  defaults: {
    message: 'No space inside hashes on closed atx style heading',
  },
  check(ctx) {
    const ignoreBlockLineNumbers = new Set<number>();
    for (const token of ctx.tree.flat) {
      if (['codeFenced', 'codeIndented', 'htmlFlow'].includes(token.type)) {
        addRangeToSet(ignoreBlockLineNumbers, token.startLine, token.endLine);
      }
    }
    for (const [lineIndex, line] of ctx.lines.entries()) {
      if (ignoreBlockLineNumbers.has(lineIndex + 1)) continue;
      const match = closedAtxRe.exec(line);
      if (!match) continue;
      const [, leftHash, leftSpace, content, rightSpace, rightEscape, rightHash, trailSpace] =
        match;
      const rightHashLength = rightHash.length;
      const left = !leftSpace.length;
      const right = !rightSpace.length || !!rightEscape;
      const rightEscapeReplacement = rightEscape ? `${rightEscape} ` : '';
      if (!left && !right) continue;
      const column = left ? 1 : line.length - trailSpace.length - rightHashLength;
      ctx.onError({
        line: lineIndex + 1,
        column,
        context: line.trim(),
        fixInfo: {
          lineNumber: lineIndex + 1,
          editColumn: 1,
          deleteCount: line.length,
          insertText: `${leftHash} ${content} ${rightEscapeReplacement}${rightHash}`,
        },
      });
    }
  },
};
