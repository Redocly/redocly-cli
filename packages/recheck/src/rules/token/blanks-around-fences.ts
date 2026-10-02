import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md031.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule, TokenRuleContext } from '../types.js';
import { getParentOfType, isBlankLine } from './helpers.js';

const codeFencePrefixRe = /^(.*?)[`~]/;

function addFenceError(
  ctx: TokenRuleContext,
  lines: readonly string[],
  lineNumber: number,
  top: boolean
): void {
  const line = lines[lineNumber - 1] ?? '';
  const prefixMatch = codeFencePrefixRe.exec(line);
  const prefix = prefixMatch?.[1];
  ctx.onError({
    line: lineNumber,
    context: line.trim(),
    fixInfo:
      prefix === undefined
        ? undefined
        : {
            lineNumber: lineNumber + (top ? 0 : 1),
            editColumn: 1,
            insertText: `${prefix.replace(/[^>]/g, ' ').trim()}\n`,
          },
  });
}

export const blanksAroundFences: TokenRule = {
  name: 'blanks-around-fences',
  tags: ['code', 'blank_lines'],
  fixable: true,
  defaults: {
    message: 'Fenced code blocks should be surrounded by blank lines',
    listItems: true,
  },
  check(ctx) {
    const listItems = ctx.config.listItems;
    const includeListItems = listItems === undefined ? true : !!listItems;
    const { lines } = ctx;
    for (const codeBlock of filterByTypes(ctx.tree, ['codeFenced'])) {
      if (includeListItems || !getParentOfType(codeBlock, ['listOrdered', 'listUnordered'])) {
        if (!isBlankLine(lines[codeBlock.startLine - 2])) {
          addFenceError(ctx, lines, codeBlock.startLine, true);
        }
        if (!isBlankLine(lines[codeBlock.endLine]) && !isBlankLine(lines[codeBlock.endLine - 1])) {
          addFenceError(ctx, lines, codeBlock.endLine, false);
        }
      }
    }
  },
};
