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

    // Only *top-level* lists: stop descending into a token's children once
    // it is itself a list (or an htmlFlow block, matching upstream) so a
    // nested sublist isn't independently reported as needing its own
    // surrounding blank lines -- that's the parent list's job.
    const topLevelLists = filterByPredicate(ctx.tree, isList, (token) =>
      isList(token) || token.type === 'htmlFlow' ? [] : token.children
    );

    for (const list of topLevelLists) {
      // Look for a blank line above the list.
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

      // Find the "visual" end of the list: its last non-"structural"
      // (indentation/blank-line/container-prefix) descendant's end line,
      // walked via the tree rather than list.endLine so a trailing
      // listItemIndent on an otherwise-empty final line doesn't push the
      // expected "below" blank-line check past the list's real content.
      const flattenedChildren = filterByPredicate(
        list.children,
        (token) => !nonContentTokens.has(token.type),
        (token) => (nonContentTokens.has(token.type) ? [] : token.children)
      );
      const endLine =
        flattenedChildren.length > 0
          ? flattenedChildren[flattenedChildren.length - 1].endLine
          : list.endLine;

      // Look for a blank line below the list.
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
