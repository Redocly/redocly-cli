// Ported from markdownlint's lib/md034.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import { filterByPredicate, getHtmlTagInfo } from './helpers.js';

/**
 * Ignores the content of inline HTML tags (e.g. `<a href="...">TEXT</a>`),
 * matching upstream's `transformChildren` callback: walks a token's direct
 * children, and whenever it finds an unclosed opening tag, skips every
 * child up to (and including) its matching closing tag. Recheck's
 * `filterByPredicate`'s `transformChildren` signature is `(token: Token)
 * => Token[]` (transform a node into the children to descend into), so
 * this reads `token.children` rather than taking an array directly.
 */
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
        // `!token.inHtmlFlow` -- matches upstream's own `!inHtmlFlow(token)`
        // check in this exact predicate (md034.mjs): a bare URL inside an
        // HTML attribute value (e.g. `<a href="https://example.com">`) is
        // reparsed as `literalAutolink` text once htmlFlow content gets
        // subtokenized (see parser/index.ts's `reparseHtmlFlow`), but it's
        // never a real markdown-prose bare URL -- it's the attribute value
        // of a real HTML tag, which upstream (and by extension MD033) is
        // the rule responsible for, not this one.
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
