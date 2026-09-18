import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md004.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { getDescendantsByType, getParentOfType } from './helpers.js';

type BulletStyle = 'asterisk' | 'dash' | 'plus';
type ConfiguredStyle = BulletStyle | 'consistent' | 'sublist';
// `expectedStyle` only ever actually holds 'consistent' (the "not yet
// observed" sentinel, before the first item is seen) or a real
// `BulletStyle` -- even in 'sublist' mode, it's reassigned from
// `nestingStyles[nesting]` (a `BulletStyle`) before use, never from the
// literal string 'sublist' itself. This is a narrower type than
// `ConfiguredStyle` specifically to exclude 'sublist' at the
// `styleToMarker`/comparison call sites below.
type ExpectedStyle = BulletStyle | 'consistent';

const markerToStyle = (marker: string): BulletStyle =>
  marker === '-' ? 'dash' : marker === '+' ? 'plus' : 'asterisk';
const styleToMarker = (style: BulletStyle): string =>
  style === 'dash' ? '-' : style === 'plus' ? '+' : '*';
const differentItemStyle = (style: BulletStyle): BulletStyle =>
  style === 'dash' ? 'plus' : style === 'plus' ? 'asterisk' : 'dash';

const validStyles = new Set(['asterisk', 'consistent', 'dash', 'plus', 'sublist']);

/**
 * Resolves the raw configured style string to a `ConfiguredStyle`, falling
 * back to 'dash' for an unrecognized value -- matches upstream's `let
 * expectedStyle = validStyles.has(style) ? style : "dash";`. Kept separate
 * from the loop's mutable `expectedStyle` (which narrows out 'sublist')
 * so the fallback logic isn't duplicated inline.
 */
function resolveConfiguredStyle(style: string): ConfiguredStyle {
  return validStyles.has(style) ? (style as ConfiguredStyle) : 'dash';
}

export const ulStyle: TokenRule = {
  name: 'ul-style',
  tags: ['bullet', 'ul'],
  fixable: true,
  defaults: {
    message: 'Unordered list style',
    style: 'consistent',
  },
  check(ctx) {
    const style = String(ctx.config.style ?? 'consistent');
    const configuredStyle = resolveConfiguredStyle(style);
    // Seed with 'dash' when the configured style is 'sublist', mirroring
    // upstream's own dead initial value in that mode: sublist mode always
    // reassigns `expectedStyle` from `nestingStyles[nesting]` (a real
    // `BulletStyle`) before the first comparison, so this initial 'dash'
    // is never actually read in that mode.
    let expectedStyle: ExpectedStyle = configuredStyle === 'sublist' ? 'dash' : configuredStyle;
    const nestingStyles: BulletStyle[] = [];

    for (const listUnordered of filterByTypes(ctx.tree, ['listUnordered'])) {
      let nesting = 0;
      if (style === 'sublist') {
        let parent = listUnordered;
        let found: ReturnType<typeof getParentOfType>;
        while ((found = getParentOfType(parent, ['listOrdered', 'listUnordered']))) {
          nesting++;
          parent = found;
        }
      }

      const listItemMarkers = getDescendantsByType(listUnordered, [
        'listItemPrefix',
        'listItemMarker',
      ]);
      for (const listItemMarker of listItemMarkers) {
        const itemStyle = markerToStyle(listItemMarker.text);
        if (style === 'sublist') {
          if (!nestingStyles[nesting]) {
            nestingStyles[nesting] =
              itemStyle === nestingStyles[nesting - 1] ? differentItemStyle(itemStyle) : itemStyle;
          }
          expectedStyle = nestingStyles[nesting];
        } else if (expectedStyle === 'consistent') {
          expectedStyle = itemStyle;
        }

        if (expectedStyle !== itemStyle) {
          const column = listItemMarker.startColumn;
          const length = listItemMarker.endColumn - listItemMarker.startColumn;
          ctx.onError({
            line: listItemMarker.startLine,
            column,
            detail: `Expected: ${expectedStyle}; Actual: ${itemStyle}`,
            fixInfo: {
              lineNumber: listItemMarker.startLine,
              editColumn: column,
              deleteCount: length,
              insertText: styleToMarker(expectedStyle),
            },
          });
        }
      }
    }
  },
};
