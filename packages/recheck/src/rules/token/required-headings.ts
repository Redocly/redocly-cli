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
    // `headings` is declared here with an `undefined` value (rather than
    // omitted) purely so validate()'s accepted-option allowlist -- built
    // from `Object.keys(tokenRule.defaults)` -- knows it's a real,
    // supported option (Object.keys includes keys whose value is
    // `undefined`). It has NO literal default VALUE: `Array.isArray`
    // below is `false` for `undefined` exactly like it is for a missing
    // key, so this changes no behavior. See the check() comment for why an
    // explicit `headings: []` must still be treated differently.
    headings: undefined,
  },
  check(ctx) {
    const requiredHeadingsList = ctx.config.headings;
    if (!Array.isArray(requiredHeadingsList)) {
      // Not configured (or configured with a non-array value): nothing to
      // check, matching upstream (params.config.headings is undefined
      // unless the user sets it — an explicit `headings: []` is a real,
      // meaningful "expect a document with no headings" configuration, not
      // the same as leaving the option unset).
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
