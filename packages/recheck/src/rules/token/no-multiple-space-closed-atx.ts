import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md019-md021.mjs (second export, MD021)
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { getHeadingStyle } from './helpers.js';
import { validateHeadingSpaces } from './no-multiple-space-atx.js';

export const noMultipleSpaceClosedAtx: TokenRule = {
  name: 'no-multiple-space-closed-atx',
  tags: ['headings', 'atx_closed', 'spaces'],
  fixable: true,
  defaults: {
    message: 'Multiple spaces inside hashes on closed atx style heading',
  },
  check(ctx) {
    const atxClosedHeadings = filterByTypes(ctx.tree, ['atxHeading']).filter(
      (heading) => getHeadingStyle(heading) === 'atx_closed'
    );
    for (const atxClosedHeading of atxClosedHeadings) {
      validateHeadingSpaces(ctx, atxClosedHeading, 1);
      validateHeadingSpaces(ctx, atxClosedHeading, -1);
    }
  },
};
