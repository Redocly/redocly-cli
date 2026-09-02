import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md026.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import {
  allPunctuationNoQuestion,
  endOfLineGemojiCodeRe,
  endOfLineHtmlEntityRe,
  escapeForRegExp,
} from './helpers.js';

export const noTrailingPunctuation: TokenRule = {
  name: 'no-trailing-punctuation',
  tags: ['headings'],
  fixable: true,
  defaults: {
    message: 'Trailing punctuation in heading',
    punctuation: allPunctuationNoQuestion,
  },
  check(ctx) {
    const punctuation = String(ctx.config.punctuation ?? allPunctuationNoQuestion);
    const trailingPunctuationRe = new RegExp(`\\s*[${escapeForRegExp(punctuation)}]+$`);
    const headings = filterByTypes(ctx.tree, ['atxHeadingText', 'setextHeadingText']);
    for (const heading of headings) {
      const { endColumn, endLine, text } = heading;
      const match = trailingPunctuationRe.exec(text);
      if (!match) continue;
      if (endOfLineHtmlEntityRe.test(text) || endOfLineGemojiCodeRe.test(text)) continue;
      const fullMatch = match[0];
      const length = fullMatch.length;
      const column = endColumn - length;
      ctx.onError({
        line: endLine,
        column,
        detail: `Punctuation: '${fullMatch}'`,
        fixInfo: {
          lineNumber: endLine,
          editColumn: column,
          deleteCount: length,
        },
      });
    }
  },
};
