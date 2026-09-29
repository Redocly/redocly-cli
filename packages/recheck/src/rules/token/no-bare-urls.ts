// Ported from markdownlint's lib/md034.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import { filterByPredicate, getHtmlTagInfo } from './helpers.js';

/** Skips the content of inline HTML tags such as `<a href="...">TEXT</a>`. */
function ignoreHtmlTagContent(token: Token): Token[] {
  const children = token.children;
  const result: Token[] = [];
  for (let i = 0; i < children.length; i++) {
    const current = children[i];
    const openTagInfo = getHtmlTagInfo(current);
    if (openTagInfo && !openTagInfo.close) {
      let count = 1;
      for (let j = i + 1; j < children.length; j++) {
        const candidate = children[j];
        const closeTagInfo = getHtmlTagInfo(candidate);
        if (closeTagInfo && openTagInfo.name === closeTagInfo.name) {
          if (closeTagInfo.close) {
            count--;
            if (count === 0) {
              i = j;
              break;
            }
          } else {
            count++;
          }
        }
      }
    } else {
      result.push(current);
    }
  }
  return result;
}

export const noBareUrls: TokenRule = {
  name: 'no-bare-urls',
  tags: ['links', 'url'],
  fixable: true,
  defaults: {
    message: 'Bare URL used',
  },
  check(ctx) {
    const literalAutolinks = filterByPredicate(
      ctx.tree,
      (token) => {
        // A bare URL inside an HTML attribute value (e.g. `<a href="https://example.com">`) is
        // not prose. `no-inline-html` handles it.
        if (token.type !== 'literalAutolink' || token.inHtmlFlow) return false;
        // Detect and ignore https://github.com/micromark/micromark/issues/164
        const siblings = token.parent?.children;
        const index = siblings?.indexOf(token) ?? -1;
        const prev = siblings?.[index - 1];
        const next = siblings?.[index + 1];
        return !(
          prev &&
          next &&
          prev.type === 'data' &&
          next.type === 'data' &&
          prev.text.endsWith('<') &&
          next.text.startsWith('>')
        );
      },
      ignoreHtmlTagContent
    );
    for (const token of literalAutolinks) {
      ctx.onError({
        line: token.startLine,
        column: token.startColumn,
        context: token.text,
        fixInfo: {
          lineNumber: token.startLine,
          editColumn: token.startColumn,
          deleteCount: token.endColumn - token.startColumn,
          insertText: `<${token.text}>`,
        },
      });
    }
  },
};
