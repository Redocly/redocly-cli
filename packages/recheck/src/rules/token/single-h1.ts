import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md025.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import {
  frontMatterHasTitle,
  getFrontmatterEndLine,
  getHeadingLevel,
  getHeadingText,
  isDocfxTab,
  isHtmlFlowComment,
  nonContentTokens,
} from './helpers.js';

export const singleH1: TokenRule = {
  name: 'single-h1',
  aliases: ['single-title'],
  tags: ['headings'],
  fixable: false,
  defaults: {
    message: 'Multiple top-level headings in the same document',
    frontMatterTitle: '^"?title"?\\s*[:=]',
    level: 1,
  },
  check(ctx) {
    const level = Number(ctx.config.level ?? 1);
    const matchingHeadings = filterByTypes(ctx.tree, ['atxHeading', 'setextHeading']).filter(
      (heading) => level === getHeadingLevel(heading) && !isDocfxTab(heading)
    );
    if (matchingHeadings.length === 0) return;

    // A front matter title counts as the top-level heading.
    const foundFrontMatterTitle = frontMatterHasTitle(ctx.tree, ctx.config.frontMatterTitle);

    let hasTopLevelHeading = foundFrontMatterTitle;
    if (!hasTopLevelHeading) {
      const firstMatch = matchingHeadings[0];
      // Look at top-level tokens only. Descendants (like the `htmlFlowData` child of an `htmlFlow`
      // comment) would confuse `isHtmlFlowComment`.
      const previousTokens = ctx.tree.children.slice(0, ctx.tree.children.indexOf(firstMatch));
      // Frontmatter is part of the tree here, so tokens up to its end are not content either.
      const frontmatterEndLine = getFrontmatterEndLine(ctx.tree);
      hasTopLevelHeading = previousTokens.every(
        (token) =>
          token.startLine <= frontmatterEndLine ||
          nonContentTokens.has(token.type) ||
          isHtmlFlowComment(token)
      );
    }

    if (hasTopLevelHeading) {
      // All other matching headings are violations.
      for (const heading of matchingHeadings.slice(foundFrontMatterTitle ? 0 : 1)) {
        ctx.onError({
          line: heading.startLine,
          context: getHeadingText(heading),
        });
      }
    }
  },
};
