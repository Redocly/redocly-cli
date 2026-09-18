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
 * Finds the first descendant of `token` with the given type, at any depth
 * (depth-first, pre-order). Explicit-stack DFS rather than call-stack
 * recursion: this runs over `htmlFlow` tokens whose reparsed subtree depth
 * tracks the block's own (attacker-controlled) markdown nesting, so
 * recursion depth must not track document nesting depth.
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

/**
 * Gets the HTML tag name of an htmlFlow token's first tag, via its
 * (Task 12-added) reparsed `htmlText` descendants — same approach as
 * upstream's own `getHtmlFlowTagName`, which reads off a nested `htmlText`
 * descendant since its parser subtokenizes htmlFlow content the same way
 * (the reparsed content nests `htmlText` under intermediate `content`/
 * `paragraph` wrapper tokens, not as a direct child).
 */
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
    frontMatterTitle: '^\\s*"?title"?\\s*[:=]',
    level: 1,
  },
  check(ctx) {
    const allowPreamble = !!ctx.config.allowPreamble;
    const level = Number(ctx.config.level ?? 1);

    // A front matter title counts as the document's top-level heading, fully
    // satisfying this rule — see frontMatterHasTitle's doc comment (upstream
    // `front_matter_title`).
    if (frontMatterHasTitle(ctx.tree, ctx.config.frontMatterTitle)) return;

    // See getFrontmatterEndLine's doc comment: recheck's parser keeps
    // frontmatter as real tokens in the tree (unlike upstream, which
    // strips it out before tokenizing), so every token through the end of
    // the frontmatter block must be skipped here too — otherwise
    // frontmatter with no recognized title (no `frontMatterTitle` match,
    // e.g. no `title:` key at all) is wrongly treated as containing the
    // document's "first line" content, tripping `!allowPreamble` even
    // when a valid heading immediately follows the frontmatter block.
    const frontmatterEndLine = getFrontmatterEndLine(ctx.tree);

    // Walk TOP-LEVEL tokens only (`ctx.tree.children`), matching upstream:
    // `params.parsers.micromark.tokens` (what md041.mjs iterates) is the
    // document's top-level sibling list, not a depth-first flattening. Using
    // `ctx.tree.flat` here would also visit descendants of the first
    // top-level token -- e.g. an `htmlFlow` HTML-comment block's
    // `htmlFlowData` child -- which `isHtmlFlowComment` only recognizes on
    // the top-level `htmlFlow` token itself, not its children, wrongly
    // treating the comment's inner text as the document's "first line".
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
