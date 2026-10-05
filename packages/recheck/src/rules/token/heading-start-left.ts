import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md023.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';

export const headingStartLeft: TokenRule = {
  name: 'heading-start-left',
  tags: ['headings', 'spaces'],
  fixable: true,
  defaults: {
    message: 'Headings must start at the beginning of the line',
  },
  check(ctx) {
    const headings = filterByTypes(ctx.tree, ['atxHeading', 'linePrefix', 'setextHeading']);
    for (let i = 0; i < headings.length - 1; i++) {
      if (
        headings[i].type === 'linePrefix' &&
        headings[i + 1].type !== 'linePrefix' &&
        headings[i].startLine === headings[i + 1].startLine
      ) {
        const { endColumn, startColumn, startLine } = headings[i];
        const length = endColumn - startColumn;
        ctx.onError({
          line: startLine,
          column: startColumn,
          context: ctx.lines[startLine - 1],
          fixInfo: {
            lineNumber: startLine,
            editColumn: startColumn,
            deleteCount: length,
          },
        });
      }
    }
  },
};
