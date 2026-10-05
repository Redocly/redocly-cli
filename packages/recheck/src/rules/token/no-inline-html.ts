import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md033.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { getHtmlTagInfo, getParentOfType } from './helpers.js';

const nextLinesRe = /[\r\n][\s\S]*$/;

function toLowerCaseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((elm) => String(elm).toLowerCase()) : [];
}

export const noInlineHtml: TokenRule = {
  name: 'no-inline-html',
  tags: ['html'],
  fixable: false,
  defaults: {
    message: 'Inline HTML',
    allowedElements: [],
    tableAllowedElements: [],
  },
  check(ctx) {
    const allowedElements = toLowerCaseStringArray(ctx.config.allowedElements);
    // If not defined, use allowedElements (same as upstream).
    const tableAllowedElements = toLowerCaseStringArray(
      (ctx.config.tableAllowedElements as unknown[] | undefined)?.length
        ? ctx.config.tableAllowedElements
        : ctx.config.allowedElements
    );
    // Also match tags inside block-level HTML (<details>, <div>, etc.).
    for (const token of filterByTypes(ctx.tree, ['htmlText'], true)) {
      const htmlTagInfo = getHtmlTagInfo(token);
      if (htmlTagInfo && !htmlTagInfo.close) {
        const elementName = htmlTagInfo.name.toLowerCase();
        const inTable = !!getParentOfType(token, ['table']);
        if (
          (inTable || !allowedElements.includes(elementName)) &&
          (!inTable || !tableAllowedElements.includes(elementName))
        ) {
          ctx.onError({
            line: token.startLine,
            column: token.startColumn,
            detail: `Element: ${htmlTagInfo.name}`,
            context: token.text.replace(nextLinesRe, ''),
          });
        }
      }
    }
  },
};
