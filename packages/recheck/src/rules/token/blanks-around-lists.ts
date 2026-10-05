// Ported from markdownlint's lib/md032.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import {
  filterByPredicate,
  getBlockQuotePrefixText,
  isBlankLine,
  nonContentTokens,
} from './helpers.js';

const isList = (token: Token): boolean =>
  token.type === 'listOrdered' || token.type === 'listUnordered';

export const blanksAroundLists: TokenRule = {
  name: 'blanks-around-lists',
  tags: ['bullet', 'ul', 'ol', 'blank_lines'],
  fixable: true,
  defaults: {
    message: 'Lists should be surrounded by blank lines',
  },
  check(ctx) {
    const { lines } = ctx;

    // Only top-level lists, so a nested list is not reported on its own.
    const topLevelLists = filterByPredicate(ctx.tree, isList, (token) =>
      isList(token) || token.type === 'htmlFlow' ? [] : token.children
    );

    for (const list of topLevelLists) {
      const firstLineNumber = list.startLine;
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

      // Use the last content token instead of list.endLine, which can include a
      // trailing indent on an empty line.
      const flattenedChildren = filterByPredicate(
        list.children,
        (token) => !nonContentTokens.has(token.type),
        (token) => (nonContentTokens.has(token.type) ? [] : token.children)
      );
      const endLine =
        flattenedChildren.length > 0
          ? flattenedChildren[flattenedChildren.length - 1].endLine
          : list.endLine;

      const lastLineNumber = endLine;
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
