import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md035.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';

export const hrStyle: TokenRule = {
  name: 'hr-style',
  tags: ['hr'],
  fixable: false,
  defaults: {
    message: 'Horizontal rule style',
    style: 'consistent',
  },
  check(ctx) {
    let style = String(ctx.config.style || 'consistent').trim();
    const thematicBreaks = filterByTypes(ctx.tree, ['thematicBreak']);
    for (const token of thematicBreaks) {
      const { startLine, text } = token;
      if (style === 'consistent') {
        style = text;
      }
      if (style !== text) {
        ctx.onError({
          line: startLine,
          detail: `Expected: ${style}; Actual: ${text}`,
          context: text,
        });
      }
    }
  },
};
