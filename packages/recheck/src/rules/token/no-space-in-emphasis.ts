// Ported from markdownlint's lib/md037.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
// Upstream also excludes bare marker `data` tokens found inside an
// `htmlFlow` block via `inHtmlFlow()` -- e.g. a `<code>*</code>` cell in an
// HTML table reparses `*` as a bare `data` token, which is HTML markup,
// not a markdown emphasis marker. Task 12's parser fix (see
// parser/index.ts's `reparseHtmlFlow`) makes recheck's parser subtokenize
// `htmlFlow` blocks the same way upstream's does, so `token.inHtmlFlow`
// (recheck's mirror of upstream's `inHtmlFlow()`/`htmlFlowSymbol`) needs
// the same exclusion here now.
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

    // Any token that has at least one direct `data`-type child (a
    // paragraph, a heading's text container, etc.) -- matches upstream's
    // `filterByPredicate(parsers.micromark.tokens, (token) => ...)`.
    const containers = filterByPredicate(ctx.tree, (token) =>
      token.children.some((child) => child.type === 'data')
    );

    for (const token of containers) {
      // Build lists of bare marker-text `data` tokens, one list per marker,
      // scanning only this container's direct children (not recursively) --
      // a fresh grouping per container, matching upstream's per-token reset.
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

      // Process bare tokens for each emphasis marker type, pairing them up
      // start/end (index i / i+1) two at a time.
      for (const [marker, emphasisTokens] of emphasisTokensByMarker.entries()) {
        for (let i = 0; i + 1 < emphasisTokens.length; i += 2) {
          // Process start token of start/end pair: look for whitespace
          // immediately following it, on its own line.
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

          // Process end token of start/end pair: look for whitespace
          // immediately preceding it, on its own line.
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
