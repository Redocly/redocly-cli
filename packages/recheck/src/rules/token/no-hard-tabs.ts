import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md010.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
// This id also used to belong to a pre-parity native scope rule with its
// own `skipCodeBlocks` option and a `spacesPerTab` default of 2 (removed in
// PR #24801, along with the translation layer that used to accept the old
// option name) — that scope rule's registry entry was deleted, so
// `no-hard-tabs` in a config now always resolves straight to this token
// rule (no alias needed; `resolveAssertion` is scope-first, and there is no
// longer a scope rule under this name to shadow it). `spacesPerTab` here
// defaults to upstream MD010's own default of 1, not the old rule's 2 —
// configs relying on the old default must set `spacesPerTab: 2` explicitly.
import type { TokenRule } from '../types.js';
import { getDescendantsByType, hasOverlap, type FileRange } from './helpers.js';

const tabRe = /\t+/g;

export const noHardTabs: TokenRule = {
  name: 'no-hard-tabs',
  tags: ['whitespace', 'hard_tab'],
  fixable: true,
  defaults: {
    message: 'Hard tabs',
    codeBlocks: true,
    ignoreCodeLanguages: [],
    spacesPerTab: 1,
  },
  check(ctx) {
    const includeCode = ctx.config.codeBlocks === undefined ? true : !!ctx.config.codeBlocks;
    const ignoreCodeLanguages = new Set(
      (Array.isArray(ctx.config.ignoreCodeLanguages) ? ctx.config.ignoreCodeLanguages : []).map(
        (language: unknown) => String(language).toLowerCase()
      )
    );
    const spacesPerTabOption = ctx.config.spacesPerTab;
    const spaceMultiplier =
      spacesPerTabOption === undefined ? 1 : Math.max(0, Number(spacesPerTabOption));

    const exclusionTypes: string[] = [];
    if (includeCode) {
      if (ignoreCodeLanguages.size > 0) {
        exclusionTypes.push('codeFenced');
      }
    } else {
      exclusionTypes.push('codeFenced', 'codeIndented', 'codeText');
    }

    const codeTokens = filterByTypes(ctx.tree, exclusionTypes).filter((token) => {
      if (token.type === 'codeFenced' && ignoreCodeLanguages.size > 0) {
        const fenceInfos = getDescendantsByType(token, ['codeFencedFence', 'codeFencedFenceInfo']);
        return fenceInfos.every((fenceInfo) =>
          ignoreCodeLanguages.has(fenceInfo.text.toLowerCase())
        );
      }
      return true;
    });

    const codeRanges: FileRange[] = codeTokens.map((token) => {
      const { type, startLine, startColumn, endLine, endColumn } = token;
      const codeFenced = type === 'codeFenced';
      return {
        startLine: startLine + (codeFenced ? 1 : 0),
        startColumn: codeFenced ? 0 : startColumn,
        endLine: endLine - (codeFenced ? 1 : 0),
        endColumn: codeFenced ? Number.MAX_SAFE_INTEGER : endColumn,
      };
    });

    for (let lineIndex = 0; lineIndex < ctx.lines.length; lineIndex++) {
      const line = ctx.lines[lineIndex];
      tabRe.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = tabRe.exec(line)) !== null) {
        const lineNumber = lineIndex + 1;
        const column = match.index + 1;
        const length = match[0].length;
        const range: FileRange = {
          startLine: lineNumber,
          startColumn: column,
          endLine: lineNumber,
          endColumn: column + length - 1,
        };
        if (!codeRanges.some((codeRange) => hasOverlap(codeRange, range))) {
          ctx.onError({
            line: lineNumber,
            column,
            detail: `Column: ${column}`,
            fixInfo: {
              lineNumber,
              editColumn: column,
              deleteCount: length,
              insertText: ''.padEnd(length * spaceMultiplier),
            },
          });
        }
      }
    }
  },
};
