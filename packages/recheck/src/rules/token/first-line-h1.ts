// Ported from markdownlint's lib/md041.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import {
  frontMatterHasTitle,
  getFrontmatterEndLine,
  getHeadingLevel,
  getHtmlTagInfo,
  isHtmlFlowComment,
  nonContentTokens,
} from './helpers.js';

const headingTagNameRe = /^h[1-6]$/;

/**
 * Finds the first descendant of `token` with the given type, at any depth.
 * Uses a loop instead of recursion so deeply nested input cannot overflow the stack.
 */
function findDescendantByType(token: Token, type: string): Token | null {
  const stack: Token[] = [];
  for (let i = token.children.length - 1; i >= 0; i--) stack.push(token.children[i]);
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    if (current.type === type) return current;
    for (let i = current.children.length - 1; i >= 0; i--) stack.push(current.children[i]);
  }
  return null;
}

/** Returns the name of the first HTML tag in an htmlFlow token. */
function getHtmlFlowTagName(token: Token): string | null {
  if (token.type !== 'htmlFlow') return null;
  const firstHtmlText = findDescendantByType(token, 'htmlText');
  const tagInfo = firstHtmlText && getHtmlTagInfo(firstHtmlText);
  return tagInfo ? tagInfo.name.toLowerCase() : null;
}

export const firstLineH1: TokenRule = {
  name: 'first-line-h1',
  aliases: ['first-line-heading'],
  tags: ['headings'],
  fixable: false,
  defaults: {
    message: 'First line in a file should be a top-level heading',
    allowPreamble: false,
    frontMatterTitle: '^"?title"?\\s*[:=]',
    level: 1,
  },
  check(ctx) {
    const allowPreamble = !!ctx.config.allowPreamble;
    const level = Number(ctx.config.level ?? 1);

    // A front matter title counts as the top-level heading.
    if (frontMatterHasTitle(ctx.tree, ctx.config.frontMatterTitle)) return;

    // Front matter is part of the tree, so skip its tokens. Otherwise front matter
    // without a title would count as content before the heading.
    const frontmatterEndLine = getFrontmatterEndLine(ctx.tree);

    // Only top-level tokens: `ctx.tree.flat` would also visit the inside of an
    // HTML comment, which isHtmlFlowComment does not recognize.
    let errorLineNumber = 0;
    for (const token of ctx.tree.children) {
      const { startLine, type } = token;
      if (startLine <= frontmatterEndLine || nonContentTokens.has(type) || isHtmlFlowComment(token))
        continue;

      const tagName = getHtmlFlowTagName(token);
      if (type === 'atxHeading' || type === 'setextHeading') {
        if (getHeadingLevel(token) !== level) {
          errorLineNumber = startLine;
        }
        break;
      } else if (tagName && headingTagNameRe.test(tagName)) {
        if (tagName !== `h${level}`) {
          errorLineNumber = startLine;
        }
        break;
      } else if (!allowPreamble) {
        errorLineNumber = startLine;
        break;
      }
    }
    if (errorLineNumber > 0) {
      ctx.onError({
        line: errorLineNumber,
        context: ctx.lines[errorLineNumber - 1],
      });
    }
  },
};
