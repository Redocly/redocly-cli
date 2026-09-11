import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md011.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { addRangeToSet, hasOverlap, type FileRange } from './helpers.js';

const reversedLinkRe = /(^|[^\\])\(([^()]+)\)\[([^\]^][^\]]*)\](?!\()/g;

export const noReversedLinks: TokenRule = {
  name: 'no-reversed-links',
  tags: ['links'],
  fixable: true,
  defaults: {
    message: 'Reversed link syntax',
  },
  check(ctx) {
    const ignoreBlockLineNumbers = new Set<number>();
    for (const ignoreBlock of filterByTypes(ctx.tree, ['codeFenced', 'codeIndented', 'mathFlow'])) {
      addRangeToSet(ignoreBlockLineNumbers, ignoreBlock.startLine, ignoreBlock.endLine);
    }
    const ignoreTexts = filterByTypes(ctx.tree, ['codeText', 'mathText']);
    for (const [lineIndex, line] of ctx.lines.entries()) {
      const lineNumber = lineIndex + 1;
      if (ignoreBlockLineNumbers.has(lineNumber)) continue;
      reversedLinkRe.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = reversedLinkRe.exec(line)) !== null) {
        const [reversedLink, preChar, linkText, linkDestination] = match;
        if (linkText.endsWith('\\') || linkDestination.endsWith('\\')) continue;
        const column = match.index + preChar.length + 1;
        const length = reversedLink.length - preChar.length;
        const range: FileRange = {
          startLine: lineNumber,
          startColumn: column,
          endLine: lineNumber,
          endColumn: column + length - 1,
        };
        if (ignoreTexts.some((ignoreText) => hasOverlap(ignoreText, range))) continue;
        ctx.onError({
          line: lineNumber,
          column,
          context: reversedLink.slice(preChar.length),
          fixInfo: {
            lineNumber,
            editColumn: column,
            deleteCount: length,
            insertText: `[${linkText}](${linkDestination})`,
          },
        });
      }
    }
  },
};
