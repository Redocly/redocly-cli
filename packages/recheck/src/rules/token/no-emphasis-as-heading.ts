import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md036.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import { allPunctuation, getDescendantsByType } from './helpers.js';

const emphasisTypes: [string, string][] = [
  ['emphasis', 'emphasisText'],
  ['strong', 'strongText'],
];

const isParagraphChildMeaningful = (token: Token): boolean =>
  !(token.type === 'htmlText' || (token.type === 'data' && token.text.trim().length === 0));

export const noEmphasisAsHeading: TokenRule = {
  name: 'no-emphasis-as-heading',
  tags: ['headings', 'emphasis'],
  fixable: false,
  defaults: {
    message: 'Emphasis used instead of a heading',
    punctuation: allPunctuation,
  },
  check(ctx) {
    const punctuation = String(ctx.config.punctuation ?? allPunctuation);
    const punctuationRe = new RegExp(`[${punctuation}]$`);
    // Upstream permits paragraphs that are either top-level or inside a
    // top-level htmlFlow (lines 34-37 of md036.mjs). Since Task 12 htmlFlow
    // reparse, paragraphs marked inHtmlFlow are excluded by default;
    // includeHtmlFlow: true (third arg) re-includes them. The filter checks
    // parent chains: include if parent is content AND either (no grandparent
    // = top-level) OR (grandparent is htmlFlow with no great-grandparent).
    const paragraphTokens = filterByTypes(ctx.tree, ['paragraph'], true).filter(
      (token) =>
        token.parent?.type === 'content' &&
        (!token.parent.parent ||
          (token.parent.parent.type === 'htmlFlow' && !token.parent.parent.parent)) &&
        token.children.filter(isParagraphChildMeaningful).length === 1
    );
    for (const [emphasisType, emphasisTextType] of emphasisTypes) {
      const textTokens = paragraphTokens.flatMap((paragraph) =>
        getDescendantsByType(paragraph, [emphasisType, emphasisTextType])
      );
      for (const textToken of textTokens) {
        if (
          textToken.children.length === 1 &&
          textToken.children[0].type === 'data' &&
          !punctuationRe.test(textToken.text)
        ) {
          ctx.onError({
            line: textToken.startLine,
            context: textToken.text,
          });
        }
      }
    }
  },
};
