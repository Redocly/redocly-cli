import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md003.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { getHeadingLevel, getHeadingStyle } from './helpers.js';

export const headingStyle: TokenRule = {
  name: 'heading-style',
  tags: ['headings'],
  fixable: false,
  defaults: {
    message: 'Heading style',
    style: 'consistent',
  },
  check(ctx) {
    let style = String(ctx.config.style ?? 'consistent');
    for (const heading of filterByTypes(ctx.tree, ['atxHeading', 'setextHeading'])) {
      const styleForToken = getHeadingStyle(heading);
      if (style === 'consistent') {
        style = styleForToken;
      }
      if (styleForToken !== style) {
        const h12 = getHeadingLevel(heading) <= 2;
        const setextWithAtx =
          style === 'setext_with_atx' &&
          ((h12 && styleForToken === 'setext') || (!h12 && styleForToken === 'atx'));
        const setextWithAtxClosed =
          style === 'setext_with_atx_closed' &&
          ((h12 && styleForToken === 'setext') || (!h12 && styleForToken === 'atx_closed'));
        if (!setextWithAtx && !setextWithAtxClosed) {
          let expected: string = style;
          if (style === 'setext_with_atx') {
            expected = h12 ? 'setext' : 'atx';
          } else if (style === 'setext_with_atx_closed') {
            expected = h12 ? 'setext' : 'atx_closed';
          }
          ctx.onError({
            line: heading.startLine,
            detail: `Expected: ${expected}; Actual: ${styleForToken}`,
          });
        }
      }
    }
  },
};
