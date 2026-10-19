import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md029.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import { getDescendantsByType } from './helpers.js';

const listStyleExamples: Record<string, string> = {
  one: '1/1/1',
  ordered: '1/2/3',
  zero: '0/0/0',
};
const listStyles = Object.keys(listStyleExamples);

function getOrderedListItemValue(listItemPrefix: Token): { column: number; value: number } {
  const listItemValue = getDescendantsByType(listItemPrefix, ['listItemValue'])[0];
  return {
    column: listItemValue.startColumn,
    value: Number(listItemValue.text),
  };
}

export const olPrefix: TokenRule = {
  name: 'ol-prefix',
  tags: ['ol'],
  fixable: true,
  defaults: {
    message: 'Ordered list item prefix',
    style: 'one_or_ordered',
  },
  check(ctx) {
    const style = String(ctx.config.style ?? 'one_or_ordered');
    for (const listOrdered of filterByTypes(ctx.tree, ['listOrdered'])) {
      const listItemPrefixes = getDescendantsByType(listOrdered, ['listItemPrefix']);
      let expected = 1;
      let incrementing = false;

      if (listItemPrefixes.length >= 2) {
        const first = getOrderedListItemValue(listItemPrefixes[0]);
        const second = getOrderedListItemValue(listItemPrefixes[1]);
        if (second.value !== 1 || first.value === 0) {
          incrementing = true;
          if (first.value === 0) {
            expected = 0;
          }
        }
      }

      const listStyle = listStyles.includes(style) ? style : incrementing ? 'ordered' : 'one';
      if (listStyle === 'zero') {
        expected = 0;
      } else if (listStyle === 'one') {
        expected = 1;
      }

      for (const listItemPrefix of listItemPrefixes) {
        const orderedListItemValue = getOrderedListItemValue(listItemPrefix);
        const actual = orderedListItemValue.value;
        if (expected !== actual) {
          ctx.onError({
            line: listItemPrefix.startLine,
            column: listItemPrefix.startColumn,
            detail: `Expected: ${expected}; Actual: ${actual}; Style: ${listStyleExamples[listStyle]}`,
            fixInfo: {
              lineNumber: listItemPrefix.startLine,
              editColumn: orderedListItemValue.column,
              deleteCount: actual.toString().length,
              insertText: expected.toString(),
            },
          });
        }
        if (listStyle === 'ordered') {
          expected++;
        }
      }
    }
  },
};
