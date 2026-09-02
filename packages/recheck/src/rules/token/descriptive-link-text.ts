import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md059.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { getDescendantsByType } from './helpers.js';

const allowedChildrenTypes = new Set(['codeText', 'htmlText']);
const defaultProhibitedTexts = ['click here', 'here', 'link', 'more'];

/** Normalizes a string by removing extra whitespace and punctuation. */
function normalize(str: string): string {
  return str
    .replace(/[\W_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

export const descriptiveLinkText: TokenRule = {
  name: 'descriptive-link-text',
  tags: ['accessibility', 'links'],
  fixable: false,
  defaults: {
    message: 'Link text should be descriptive',
    prohibitedTexts: defaultProhibitedTexts,
  },
  check(ctx) {
    const configuredProhibited = ctx.config.prohibitedTexts;
    // Matches upstream's `config.prohibited_texts || defaultProhibitedTexts`
    // (md059.mjs): an explicitly configured empty array is truthy in JS, so
    // it is used as-is (yielding an empty Set below, which disables the
    // rule) rather than falling back to the defaults -- only a missing/
    // non-array value falls back. Mirrors the other array-option rules in
    // this batch (e.g. reference-links-images's ignoredLabels), which all
    // use a plain `Array.isArray(...) ? ... : defaults` with no additional
    // length check.
    const prohibitedTexts = new Set(
      (Array.isArray(configuredProhibited)
        ? configuredProhibited.map(String)
        : defaultProhibitedTexts
      ).map(normalize)
    );
    if (prohibitedTexts.size === 0) return;

    for (const link of filterByTypes(ctx.tree, ['link'])) {
      const labelTexts = getDescendantsByType(link, ['label', 'labelText']);
      for (const labelText of labelTexts) {
        const { children, endLine, parent, startColumn, startLine, text } = labelText;
        if (
          !children.some((child) => allowedChildrenTypes.has(child.type)) &&
          prohibitedTexts.has(normalize(text))
        ) {
          const hasRange = startLine === endLine;
          ctx.onError({
            line: startLine,
            column: hasRange ? startColumn : undefined,
            context: hasRange ? (parent?.text ?? text) : undefined,
          });
        }
      }
    }
  },
};
