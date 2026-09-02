// Ported from markdownlint's lib/md049-md050.mjs (the MD049 half)
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { filterByPredicate, getDescendantsByType } from './helpers.js';

const intrawordRe = /^\w$/;

function emphasisOrStrongStyleFor(markup: string): 'asterisk' | 'underscore' {
  return markup[0] === '*' ? 'asterisk' : 'underscore';
}

export const emphasisStyle: TokenRule = {
  name: 'emphasis-style',
  tags: ['emphasis'],
  fixable: true,
  defaults: {
    message: 'Emphasis style',
    style: 'consistent',
  },
  check(ctx) {
    const { lines } = ctx;
    let style = String(ctx.config.style || 'consistent');
    const emphasisTokens = filterByPredicate(
      ctx.tree,
      (token) => token.type === 'emphasis',
      (token) => (token.type === 'htmlFlow' ? [] : token.children)
    );
    for (const token of emphasisTokens) {
      const sequences = getDescendantsByType(token, ['emphasisSequence']);
      const startSequence = sequences[0];
      const endSequence = sequences[sequences.length - 1];
      if (!startSequence || !endSequence) continue;
      const markupStyle = emphasisOrStrongStyleFor(startSequence.text);
      if (style === 'consistent') {
        style = markupStyle;
      }
      if (style !== markupStyle) {
        const underscoreIntraword =
          style === 'underscore' &&
          (intrawordRe.test(
            lines[startSequence.startLine - 1]?.[startSequence.startColumn - 2] ?? ''
          ) ||
            intrawordRe.test(lines[endSequence.endLine - 1]?.[endSequence.endColumn - 1] ?? ''));
        if (!underscoreIntraword) {
          for (const sequence of [startSequence, endSequence]) {
            ctx.onError({
              line: sequence.startLine,
              column: sequence.startColumn,
              detail: `Expected: ${style}; Actual: ${markupStyle}`,
              fixInfo: {
                lineNumber: sequence.startLine,
                editColumn: sequence.startColumn,
                deleteCount: sequence.text.length,
                insertText: style === 'asterisk' ? '*' : '_',
              },
            });
          }
        }
      }
    }
  },
};
