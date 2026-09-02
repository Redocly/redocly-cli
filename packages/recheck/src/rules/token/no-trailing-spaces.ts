import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md009.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
// This id also used to belong to a pre-parity native scope rule with its
// own `skipCodeBlocks` option (removed in PR #24801, along with the
// translation layer that used to accept it here as `codeBlocks: false`) —
// that scope rule's registry entry was deleted, so `no-trailing-spaces` in
// a config now always resolves straight to this token rule (no alias
// needed; `resolveAssertion` is scope-first, and there is no longer a
// scope rule under this name to shadow it).
import type { TokenRule } from '../types.js';
import { addRangeToSet } from './helpers.js';

export const noTrailingSpaces: TokenRule = {
  name: 'no-trailing-spaces',
  tags: ['whitespace'],
  fixable: true,
  defaults: {
    message: 'Trailing spaces',
    brSpaces: 2,
    codeBlocks: false,
    listItemEmptyLines: false,
    strict: false,
  },
  check(ctx) {
    const brSpaces = Number(ctx.config.brSpaces ?? 2);
    const includeCode = !!ctx.config.codeBlocks;
    const listItemEmptyLines = !!ctx.config.listItemEmptyLines;
    const strict = !!ctx.config.strict;

    const codeBlockLineNumbers = new Set<number>();
    if (!includeCode) {
      for (const codeBlock of filterByTypes(ctx.tree, ['codeFenced'])) {
        addRangeToSet(codeBlockLineNumbers, codeBlock.startLine + 1, codeBlock.endLine - 1);
      }
      for (const codeBlock of filterByTypes(ctx.tree, ['codeIndented'])) {
        addRangeToSet(codeBlockLineNumbers, codeBlock.startLine, codeBlock.endLine);
      }
    }

    const listItemLineNumbers = new Set<number>();
    if (listItemEmptyLines) {
      for (const listBlock of filterByTypes(ctx.tree, ['listOrdered', 'listUnordered'])) {
        addRangeToSet(listItemLineNumbers, listBlock.startLine, listBlock.endLine);
        let trailingIndent = true;
        for (let i = listBlock.children.length - 1; i >= 0; i--) {
          const child = listBlock.children[i];
          switch (child.type) {
            case 'content':
              trailingIndent = false;
              break;
            case 'listItemIndent':
              if (trailingIndent) {
                listItemLineNumbers.delete(child.startLine);
              }
              break;
            case 'listItemPrefix':
              trailingIndent = true;
              break;
            default:
              break;
          }
        }
      }
    }

    const paragraphLineNumbers = new Set<number>();
    const codeInlineLineNumbers = new Set<number>();
    if (strict) {
      for (const paragraph of filterByTypes(ctx.tree, ['paragraph'])) {
        addRangeToSet(paragraphLineNumbers, paragraph.startLine, paragraph.endLine - 1);
      }
      for (const codeText of filterByTypes(ctx.tree, ['codeText'])) {
        addRangeToSet(codeInlineLineNumbers, codeText.startLine, codeText.endLine - 1);
      }
    }

    const expected = brSpaces < 2 ? 0 : brSpaces;
    for (let lineIndex = 0; lineIndex < ctx.lines.length; lineIndex++) {
      const line = ctx.lines[lineIndex];
      const lineNumber = lineIndex + 1;
      const trailingSpaces = line.length - line.trimEnd().length;
      if (
        trailingSpaces &&
        !codeBlockLineNumbers.has(lineNumber) &&
        !listItemLineNumbers.has(lineNumber) &&
        (expected !== trailingSpaces ||
          (strict &&
            (!paragraphLineNumbers.has(lineNumber) || codeInlineLineNumbers.has(lineNumber))))
      ) {
        const column = line.length - trailingSpaces + 1;
        ctx.onError({
          line: lineNumber,
          column,
          detail: `Expected: ${expected === 0 ? '' : '0 or '}${expected}; Actual: ${trailingSpaces}`,
          fixInfo: {
            lineNumber,
            editColumn: column,
            deleteCount: trailingSpaces,
          },
        });
      }
    }
  },
};
