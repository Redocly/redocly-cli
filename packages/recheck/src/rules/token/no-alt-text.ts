import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md045.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { getDescendantsByType, getHtmlAttributeRe, getHtmlTagInfo } from './helpers.js';

const nextLinesRe = /[\r\n][\s\S]*$/;
const altRe = getHtmlAttributeRe('alt');
const ariaHiddenRe = getHtmlAttributeRe('aria-hidden');

export const noAltText: TokenRule = {
  name: 'no-alt-text',
  tags: ['accessibility', 'images'],
  fixable: false,
  defaults: {
    message: 'Images should have alternate text (alt text)',
  },
  check(ctx) {
    for (const image of filterByTypes(ctx.tree, ['image'])) {
      const labelTexts = getDescendantsByType(image, ['label', 'labelText']);
      if (labelTexts.some((labelText) => labelText.text.length === 0)) {
        const hasRange = image.startLine === image.endLine;
        ctx.onError({
          line: image.startLine,
          column: hasRange ? image.startColumn : undefined,
          context: hasRange ? image.text : undefined,
        });
      }
    }

    // Also match `<img>` tags inside block-level HTML.
    for (const htmlText of filterByTypes(ctx.tree, ['htmlText'], true)) {
      const { startColumn, startLine, text } = htmlText;
      const htmlTagInfo = getHtmlTagInfo(htmlText);
      if (
        htmlTagInfo &&
        !htmlTagInfo.close &&
        htmlTagInfo.name.toLowerCase() === 'img' &&
        !altRe.test(text) &&
        ariaHiddenRe.exec(text)?.[1].toLowerCase() !== 'true'
      ) {
        ctx.onError({
          line: startLine,
          column: startColumn,
          context: text.replace(nextLinesRe, ''),
        });
      }
    }
  },
};
