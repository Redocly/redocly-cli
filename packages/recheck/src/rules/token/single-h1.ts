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
    frontMatterTitle: '^\\s*"?title"?\\s*[:=]',
    level: 1,
  },
  check(ctx) {
    const level = Number(ctx.config.level ?? 1);
    const matchingHeadings = filterByTypes(ctx.tree, ['atxHeading', 'setextHeading']).filter(
      (heading) => level === getHeadingLevel(heading) && !isDocfxTab(heading)
    );
    if (matchingHeadings.length === 0) return;

    // A front matter title counts as the document's top-level heading — see
    // frontMatterHasTitle's doc comment (upstream `front_matter_title`).
    const foundFrontMatterTitle = frontMatterHasTitle(ctx.tree, ctx.config.frontMatterTitle);

    let hasTopLevelHeading = foundFrontMatterTitle;
    if (!hasTopLevelHeading) {
      const firstMatch = matchingHeadings[0];
      // Walk TOP-LEVEL tokens only (`ctx.tree.children`), matching
      // upstream: `params.parsers.micromark.tokens` (what md025.mjs slices)
      // is the document's top-level sibling list, not a depth-first
      // flattening. Using `ctx.tree.flat` here would also include
      // descendants of the first top-level token -- e.g. an `htmlFlow`
      // HTML-comment block's `htmlFlowData` child, which `isHtmlFlowComment`
      // only recognizes on the top-level `htmlFlow` token itself.
      const previousTokens = ctx.tree.children.slice(0, ctx.tree.children.indexOf(firstMatch));
      // See getFrontmatterEndLine's doc comment: recheck's parser keeps
      // frontmatter as real tokens in the tree (unlike upstream, which
      // strips it out before tokenizing), so every token through the end
      // of the frontmatter block must be treated as non-content here too
      // — otherwise frontmatter with no recognized title before the first
      // heading was wrongly read as "content precedes the first heading",
      // making `hasTopLevelHeading` false and silently suppressing a real
      // duplicate top-level-heading violation.
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
