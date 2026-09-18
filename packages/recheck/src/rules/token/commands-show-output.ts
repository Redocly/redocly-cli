import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md014.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';

const dollarCommandRe = /^(\s*)(\$\s+)/;

export const commandsShowOutput: TokenRule = {
  name: 'commands-show-output',
  tags: ['code'],
  fixable: true,
  defaults: {
    message: 'Dollar signs used before commands without showing output',
  },
  check(ctx) {
    for (const codeBlock of filterByTypes(ctx.tree, ['codeFenced', 'codeIndented'])) {
      const codeFlowValues = codeBlock.children.filter((child) => child.type === 'codeFlowValue');
      const dollarMatches = codeFlowValues
        .map((codeFlowValue) => ({
          result: dollarCommandRe.exec(codeFlowValue.text),
          startColumn: codeFlowValue.startColumn,
          startLine: codeFlowValue.startLine,
        }))
        .filter(
          (dollarMatch): dollarMatch is typeof dollarMatch & { result: RegExpExecArray } =>
            dollarMatch.result !== null
        );
      if (dollarMatches.length === codeFlowValues.length) {
        for (const dollarMatch of dollarMatches) {
          const column = dollarMatch.startColumn + dollarMatch.result[1].length;
          const length = dollarMatch.result[2].length;
          ctx.onError({
            line: dollarMatch.startLine,
            column,
            fixInfo: {
              lineNumber: dollarMatch.startLine,
              editColumn: column,
              deleteCount: length,
            },
          });
        }
      }
    }
  },
};
