import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md046.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';

function tokenTypeToStyle(tokenType: string): 'fenced' | 'indented' {
  return tokenType === 'codeFenced' ? 'fenced' : 'indented';
}

export const codeBlockStyle: TokenRule = {
  name: 'code-block-style',
  tags: ['code'],
  fixable: false,
  defaults: {
    message: 'Code block style',
    style: 'consistent',
  },
  check(ctx) {
    let expectedStyle = String(ctx.config.style || 'consistent');
    for (const token of filterByTypes(ctx.tree, ['codeFenced', 'codeIndented'])) {
      const { startLine, type } = token;
      if (expectedStyle === 'consistent') {
        expectedStyle = tokenTypeToStyle(type);
      }
      const actualStyle = tokenTypeToStyle(type);
      if (expectedStyle !== actualStyle) {
        ctx.onError({
          line: startLine,
          detail: `Expected: ${expectedStyle}; Actual: ${actualStyle}`,
        });
      }
    }
  },
};
