import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md043.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { getHeadingLevel, getHeadingText } from './helpers.js';

export const requiredHeadings: TokenRule = {
  name: 'required-headings',
  tags: ['headings'],
  fixable: false,
  defaults: {
    message: 'Required heading structure',
    matchCase: false,
    // Declared as `undefined` so it is an accepted option.
    headings: undefined,
  },
  check(ctx) {
    const requiredHeadingsList = ctx.config.headings;
    if (!Array.isArray(requiredHeadingsList)) {
      // Not configured: nothing to check. An explicit `headings: []` is different: it means
      // the document must have no headings.
      return;
    }
    const matchCase = !!ctx.config.matchCase;
    let i = 0;
    let matchAny = false;
    let hasError = false;
    let anyHeadings = false;
    const getExpected = () => String(requiredHeadingsList[i++] ?? '[None]');
    const handleCase = (str: string) => (matchCase ? str : str.toLowerCase());

    for (const heading of filterByTypes(ctx.tree, ['atxHeading', 'setextHeading'])) {
      if (hasError) break;
      const headingText = getHeadingText(heading);
      const headingLevel = getHeadingLevel(heading);
      anyHeadings = true;
      const actual = `${'#'.repeat(headingLevel)} ${headingText}`;
      const expected = getExpected();
      if (expected === '*') {
        const nextExpected = getExpected();
        if (handleCase(nextExpected) !== handleCase(actual)) {
          matchAny = true;
          i--;
        }
      } else if (expected === '+') {
        matchAny = true;
      } else if (expected === '?') {
        // Allow current, match next.
      } else if (handleCase(expected) === handleCase(actual)) {
        matchAny = false;
      } else if (matchAny) {
        i--;
      } else {
        ctx.onError({
          line: heading.startLine,
          detail: `Expected: ${expected}; Actual: ${actual}`,
        });
        hasError = true;
      }
    }

    const extraHeadings = requiredHeadingsList.length - i;
    if (
      !hasError &&
      (extraHeadings > 1 || (extraHeadings === 1 && requiredHeadingsList[i] !== '*')) &&
      (anyHeadings || !requiredHeadingsList.every((heading) => heading === '*'))
    ) {
      ctx.onError({
        line: ctx.lines.length,
        context: String(requiredHeadingsList[i]),
      });
    }
  },
};
