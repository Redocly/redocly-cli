import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md001.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { frontMatterHasTitle, getHeadingLevel } from './helpers.js';

export const headingIncrement: TokenRule = {
  name: 'heading-increment',
  tags: ['headings'],
  fixable: false,
  defaults: {
    message: 'Heading levels should only increment by one level at a time.',
    frontMatterTitle: '^\\s*"?title"?\\s*[:=]',
  },
  check(ctx) {
    // A front matter title counts as the document's implicit h1 — see
    // frontMatterHasTitle's doc comment (upstream `front_matter_title`).
    let previous = frontMatterHasTitle(ctx.tree, ctx.config.frontMatterTitle) ? 1 : 0;
    for (const heading of filterByTypes(ctx.tree, ['atxHeading', 'setextHeading'])) {
      const level = getHeadingLevel(heading);
      if (previous && level > previous + 1) {
        ctx.onError({
          line: heading.startLine,
          detail: `Expected: h${previous + 1}; Actual: h${level}`,
        });
      }
      previous = level;
    }
  },
};
