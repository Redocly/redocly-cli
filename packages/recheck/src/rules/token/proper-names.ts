import { filterByTypes, parseMarkdown } from '../../parser/index.js';
// Ported from markdownlint's lib/md044.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import { escapeForRegExp, filterByPredicate, hasOverlap, type FileRange } from './helpers.js';

const ignoredChildTypes = new Set(['codeFencedFence', 'definition', 'reference', 'resource']);

export const properNames: TokenRule = {
  name: 'proper-names',
  tags: ['spelling'],
  fixable: true,
  defaults: {
    message: 'Proper names should have the correct capitalization',
    names: [],
    codeBlocks: true,
    htmlElements: true,
  },
  check(ctx) {
    const configuredNames = ctx.config.names;
    const names = (Array.isArray(configuredNames) ? configuredNames.map(String) : []).sort(
      (a, b) => b.length - a.length || a.localeCompare(b)
    );
    if (names.length === 0) return;

    const includeCodeBlocks = ctx.config.codeBlocks === undefined ? true : !!ctx.config.codeBlocks;
    const includeHtmlElements =
      ctx.config.htmlElements === undefined ? true : !!ctx.config.htmlElements;
    const scannedTypes = new Set(['data']);
    if (includeCodeBlocks) {
      scannedTypes.add('codeFlowValue');
      scannedTypes.add('codeTextData');
    }
    if (includeHtmlElements) {
      scannedTypes.add('htmlFlowData');
      scannedTypes.add('htmlTextData');
    }

    const contentTokens = filterByPredicate(
      ctx.tree,
      (token) => scannedTypes.has(token.type),
      (token) => token.children.filter((t) => !ignoredChildTypes.has(t.type))
    );

    const exclusions: FileRange[] = [];
    const scannedTokens = new Set<Token>();

    for (const name of names) {
      const escapedName = escapeForRegExp(name);
      const startNamePattern = /^\W/.test(name) ? '' : '\\b_*';
      const endNamePattern = /\W$/.test(name) ? '' : '_*\\b';
      const namePattern = `(${startNamePattern})(${escapedName})${endNamePattern}`;
      const nameRe = new RegExp(namePattern, 'gi');
      for (const token of contentTokens) {
        let match: RegExpExecArray | null;
        while ((match = nameRe.exec(token.text)) !== null) {
          const [, leftMatch, nameMatch] = match;
          const column = token.startColumn + match.index + leftMatch.length;
          const length = nameMatch.length;
          const lineNumber = token.startLine;
          const nameRange: FileRange = {
            startLine: lineNumber,
            startColumn: column,
            endLine: lineNumber,
            endColumn: column + length - 1,
          };
          if (
            !names.includes(nameMatch) &&
            !exclusions.some((exclusion) => hasOverlap(exclusion, nameRange))
          ) {
            let autolinkRanges: FileRange[] = [];
            if (!scannedTokens.has(token)) {
              // Deliberately parsed without `{ markdoc: true }`. A well-formed
              // tag is already split out as its own `markdocTag` sibling
              // upstream, so tag text rarely reaches this sub-parse; and when
              // `{% ... %}` text did not tokenize upstream (an unterminated or
              // degenerate span, or one inside code or HTML), treating it as
              // prose is what's wanted. The flag is not a no-op here: turning
              // it on would suppress autolinks nested inside a tag, as in
              // `{% a href=http://x.com %}`.
              autolinkRanges = filterByTypes(parseMarkdown(token.text), ['literalAutolink']).map(
                (tok) => ({
                  startLine: lineNumber,
                  startColumn: token.startColumn + tok.startColumn - 1,
                  endLine: lineNumber,
                  endColumn: token.endColumn + tok.endColumn - 1,
                })
              );
              exclusions.push(...autolinkRanges);
              scannedTokens.add(token);
            }
            if (!autolinkRanges.some((autolinkRange) => hasOverlap(autolinkRange, nameRange))) {
              ctx.onError({
                line: lineNumber,
                column,
                detail: `Expected: ${name}; Actual: ${nameMatch}`,
                fixInfo: {
                  lineNumber,
                  editColumn: column,
                  deleteCount: length,
                  insertText: name,
                },
              });
            }
          }
          exclusions.push(nameRange);
        }
      }
    }
  },
};
