// Ported from markdownlint's lib/md037.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
// Like upstream, bare marker `data` tokens inside `htmlFlow` (e.g. the `*` in a `<code>*</code>`
// table cell) are skipped. `token.inHtmlFlow` marks them.
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import { filterByPredicate } from './helpers.js';

const emphasisMarkers = ['_', '__', '___', '*', '**', '***'] as const;

export const noSpaceInEmphasis: TokenRule = {
  name: 'no-space-in-emphasis',
  tags: ['whitespace', 'emphasis'],
  fixable: true,
  defaults: {
    message: 'Spaces inside emphasis markers',
  },
  check(ctx) {
    const { lines } = ctx;

    // Tokens with at least one direct `data` child (a paragraph, a heading's text, etc.).
    const containers = filterByPredicate(ctx.tree, (token) =>
      token.children.some((child) => child.type === 'data')
    );

    for (const token of containers) {
      // Group bare marker `data` tokens per marker, looking only at direct children.
      const emphasisTokensByMarker = new Map<string, Token[]>(
        emphasisMarkers.map((marker) => [marker, []])
      );
      for (const child of token.children) {
        const { text, type } = child;
        if (type === 'data' && text.length <= 3 && !child.inHtmlFlow) {
          const emphasisTokens = emphasisTokensByMarker.get(text);
          emphasisTokens?.push(child);
        }
      }

      // Pair up start and end markers (index i and i+1) for each marker type.
      for (const [marker, emphasisTokens] of emphasisTokensByMarker.entries()) {
        for (let i = 0; i + 1 < emphasisTokens.length; i += 2) {
          // Start token of a pair: look for whitespace right after it, on its own line.
          const startToken = emphasisTokens[i];
          const startLine = lines[startToken.startLine - 1] ?? '';
          const startSlice = startLine.slice(startToken.endColumn - 1);
          const startMatch = /^\s+\S/.exec(startSlice);
          if (startMatch) {
            const startSpaceCharacter = startMatch[0];
            const column = startToken.endColumn;
            const count = startSpaceCharacter.length - 1;
            ctx.onError({
              line: startToken.startLine,
              column,
              context: `${marker}${startSpaceCharacter}`,
              fixInfo: {
                lineNumber: startToken.startLine,
                editColumn: column,
                deleteCount: count,
              },
            });
          }

          // End token of a pair: look for whitespace right before it, on its own line.
          const endToken = emphasisTokens[i + 1];
          const endLine = lines[endToken.startLine - 1] ?? '';
          const endSlice = endLine.slice(0, endToken.startColumn - 1);
          const endMatch = /\S\s+$/.exec(endSlice);
          if (endMatch) {
            const endSpaceCharacter = endMatch[0];
            const column = endToken.startColumn - (endSpaceCharacter.length - 1);
            const count = endSpaceCharacter.length - 1;
            ctx.onError({
              line: endToken.startLine,
              column,
              context: `${endSpaceCharacter}${marker}`,
              fixInfo: {
                lineNumber: endToken.startLine,
                editColumn: column,
                deleteCount: count,
              },
            });
          }
        }
      }
    }
  },
};
