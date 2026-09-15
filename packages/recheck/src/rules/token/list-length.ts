import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import { filterByPredicate } from './helpers.js';

const isList = (token: Token): boolean =>
  token.type === 'listOrdered' || token.type === 'listUnordered';

// Recheck-original rule (no markdownlint equivalent, so it sits outside the
// parity comparison). A list that never grew past a single bullet usually
// reads better as a plain sentence, and a list that grows very long asks a
// reader to hold too many parallel items in mind at once -- both are
// style-guide judgment calls rather than markdown syntax errors, which is
// why this rule ships a modest default `min` of 2 but no default `max` at
// all (an unbounded list is not, by itself, wrong).
//
// Every list is its own subject and is evaluated independently, INCLUDING
// nested sublists: a two-item parent list with a one-item child list flags
// only the child, at the child's own `startLine`. This deliberately does
// NOT reuse blanks-around-lists' (MD032) top-level-only traversal --that
// rule stops descending at the first list boundary because surrounding-
// blank-line placement is the OUTER list's concern and a nested list's
// blank lines are its parent's problem, not its own. Item *count* has no
// such parent/child relationship: a short sublist is exactly as much a
// "too-short list" as a short top-level one, so this rule descends into
// every list's children rather than stopping at the first match.
export const listLength: TokenRule = {
  name: 'list-length',
  tags: ['bullet', 'ul', 'ol'],
  fixable: false,
  defaults: {
    message: 'List has %s item(s)',
    min: 2,
    // `max` is declared here with an `undefined` value (rather than
    // omitted) purely so validate()'s accepted-option allowlist -- built
    // from `Object.keys(tokenRule.defaults)` -- knows it's a real, accepted
    // option (Object.keys includes keys whose value is `undefined`; see
    // line-length/required-headings' identical precedent, fd197bb4ad7).
    // It has NO literal default VALUE: `undefined` means "no upper bound",
    // which is not the same as some literal number.
    max: undefined,
  },
  check(ctx) {
    const min = Number(ctx.config.min ?? 2);
    const max = ctx.config.max === undefined ? undefined : Number(ctx.config.max);

    for (const list of filterByPredicate(ctx.tree, isList, (token) => token.children)) {
      const count = list.children.filter((token) => token.type === 'listItemPrefix').length;

      // A list can violate at most one bound at a time (a valid config
      // never has min > max, and validate() rejects one that does), so
      // these are mutually exclusive branches rather than two independent
      // checks.
      if (count < min) {
        ctx.onError({ line: list.startLine, context: String(count), detail: `minimum ${min}` });
      } else if (max !== undefined && count > max) {
        ctx.onError({ line: list.startLine, context: String(count), detail: `maximum ${max}` });
      }
    }
  },
};
