import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md019-md021.mjs (first export, MD019)
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { Token } from '../../parser/types.js';
import type { TokenRule, TokenRuleContext } from '../types.js';
import { getHeadingStyle } from './helpers.js';

/**
 * Shared by MD019 (`no-multiple-space-atx`) and MD021
 * (`no-multiple-space-closed-atx`) — upstream ports both from the single
 * `md019-md021.mjs` file's `validateHeadingSpaces` helper. `delta` is the
 * scan direction: `1` scans forward from the start of the heading's
 * children (the opening `#` sequence), `-1` scans backward from the end
 * (the closing `#` sequence, atx_closed only).
 */
export function validateHeadingSpaces(ctx: TokenRuleContext, heading: Token, delta: 1 | -1): void {
  const { children, startLine, text } = heading;
  let index = delta > 0 ? 0 : children.length - 1;
  while (children[index] && children[index].type !== 'atxHeadingSequence') {
    index += delta;
  }
  const headingSequence = children[index];
  const whitespace = children[index + delta];
  if (
    headingSequence?.type === 'atxHeadingSequence' &&
    whitespace?.type === 'whitespace' &&
    whitespace.text.length > 1
  ) {
    const column = whitespace.startColumn + 1;
    const length = whitespace.endColumn - column;
    ctx.onError({
      line: startLine,
      column,
      context: text.trim(),
      fixInfo: {
        lineNumber: startLine,
        editColumn: column,
        deleteCount: length,
      },
    });
  }
}

export const noMultipleSpaceAtx: TokenRule = {
  name: 'no-multiple-space-atx',
  tags: ['headings', 'atx', 'spaces'],
  fixable: true,
  defaults: {
    message: 'Multiple spaces after hash on atx style heading',
  },
  check(ctx) {
    const atxHeadings = filterByTypes(ctx.tree, ['atxHeading']).filter(
      (heading) => getHeadingStyle(heading) === 'atx'
    );
    for (const atxHeading of atxHeadings) {
      validateHeadingSpaces(ctx, atxHeading, 1);
    }
  },
};
