import { filterByTypes } from '../../parser/index.js';
import type { TokenRule } from '../types.js';
import { getHeadingText } from './helpers.js';

// Recheck-original rule (no markdownlint equivalent, so it sits outside the
// parity comparison). A heading with no text content is an accessibility
// problem — it lands in the document outline and in screen-reader heading
// navigation as an empty entry — and is almost always an editing accident
// (a stray `#`, or markup that renders to nothing).
//
// "Text content" is whatever `getHeadingText` returns, which deliberately
// drops `htmlText` children: `## <span></span>` contributes no readable
// text and is reported, while inline code is real content and is not
// (`` # `config.yaml` `` is a legitimate heading).
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
