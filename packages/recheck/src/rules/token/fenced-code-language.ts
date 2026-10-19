import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md040.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { getDescendantsByType } from './helpers.js';

export const fencedCodeLanguage: TokenRule = {
  name: 'fenced-code-language',
  tags: ['code', 'language'],
  fixable: false,
  defaults: {
    message: 'Fenced code blocks should have a language specified',
    allowedLanguages: [],
    languageOnly: false,
  },
  check(ctx) {
    const configured = ctx.config.allowedLanguages;
    const allowed = Array.isArray(configured) ? (configured as unknown[]).map(String) : [];
    const languageOnly = !!ctx.config.languageOnly;
    for (const fencedCode of filterByTypes(ctx.tree, ['codeFenced'])) {
      const openingFence = getDescendantsByType(fencedCode, ['codeFencedFence'])[0];
      const { startLine, text } = openingFence;
      const info = getDescendantsByType(openingFence, ['codeFencedFenceInfo'])[0]?.text;
      if (!info) {
        ctx.onError({ line: startLine, context: text });
      } else if (allowed.length > 0 && !allowed.includes(info)) {
        ctx.onError({ line: startLine, detail: `"${info}" is not allowed` });
      }
      if (languageOnly && getDescendantsByType(openingFence, ['codeFencedFenceMeta']).length > 0) {
        ctx.onError({
          line: startLine,
          detail: `Info string contains more than language: "${text}"`,
        });
      }
    }
  },
};
