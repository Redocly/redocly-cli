import { filterByTypes } from '../../parser/index.js';
import type { TokenRule } from '../types.js';
import { getHeadingText } from './helpers.js';

// Recheck-original rule (no markdownlint equivalent). An empty heading shows up as an empty
// entry in the outline and in screen-reader navigation. The text comes from `getHeadingText`,
// which ignores `htmlText`: `## <span></span>` is reported, but `` # `config.yaml` `` is not.
export const noEmptyHeadings: TokenRule = {
  name: 'no-empty-headings',
  tags: ['headings', 'accessibility'],
  fixable: false,
  defaults: {
    message: 'Headings should have text content',
  },
  check(ctx) {
    for (const heading of filterByTypes(ctx.tree, ['atxHeading', 'setextHeading'])) {
      if (getHeadingText(heading).trim().length === 0) {
        ctx.onError({ line: heading.startLine });
      }
    }
  },
};
