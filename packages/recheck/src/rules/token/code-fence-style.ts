import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md048.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { getDescendantsByType } from './helpers.js';

function fencedCodeBlockStyleFor(markup: string): 'tilde' | 'backtick' {
  return markup[0] === '~' ? 'tilde' : 'backtick';
}

export const codeFenceStyle: TokenRule = {
  name: 'code-fence-style',
  tags: ['code'],
  fixable: false,
  defaults: {
    message: 'Code fence style',
    style: 'consistent',
  },
  check(ctx) {
    let expectedStyle = String(ctx.config.style || 'consistent');
    for (const codeFenced of filterByTypes(ctx.tree, ['codeFenced'])) {
      const codeFencedFenceSequence = getDescendantsByType(codeFenced, [
        'codeFencedFence',
        'codeFencedFenceSequence',
      ])[0];
      const { startLine, text } = codeFencedFenceSequence;
      if (expectedStyle === 'consistent') {
        expectedStyle = fencedCodeBlockStyleFor(text);
      }
      const actualStyle = fencedCodeBlockStyleFor(text);
      if (expectedStyle !== actualStyle) {
        ctx.onError({
          line: startLine,
          detail: `Expected: ${expectedStyle}; Actual: ${actualStyle}`,
        });
      }
    }
  },
};
