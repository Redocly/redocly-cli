import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import { filterByPredicate } from './helpers.js';

const isList = (token: Token): boolean =>
  token.type === 'listOrdered' || token.type === 'listUnordered';

// Recheck-original rule (no markdownlint equivalent). A one-item list usually reads better
// as a sentence, and a very long list is hard to follow. Every list is checked on its own,
// including nested lists.
export const listLength: TokenRule = {
  name: 'list-length',
  tags: ['bullet', 'ul', 'ol'],
  fixable: false,
  defaults: {
    message: 'List has %s item(s)',
    min: 2,
    // Declared as `undefined` so it is an accepted option. No value means no upper bound.
    max: undefined,
  },
  check(ctx) {
    const min = Number(ctx.config.min ?? 2);
    const max = ctx.config.max === undefined ? undefined : Number(ctx.config.max);

    for (const list of filterByPredicate(ctx.tree, isList, (token) => token.children)) {
      const count = list.children.filter((token) => token.type === 'listItemPrefix').length;

      // A list can break only one of the two limits.
      if (count < min) {
        ctx.onError({ line: list.startLine, context: String(count), detail: `minimum ${min}` });
      } else if (max !== undefined && count > max) {
        ctx.onError({ line: list.startLine, context: String(count), detail: `maximum ${max}` });
      }
    }
  },
};
