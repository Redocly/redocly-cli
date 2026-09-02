import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md039.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { Token } from '../../parser/types.js';
import type { TokenRule, TokenRuleContext } from '../types.js';

function addLabelSpaceError(
  ctx: TokenRuleContext,
  label: Token,
  labelText: Token,
  isStart: boolean
): void {
  const match = (isStart ? /^[^\S\r\n]+/ : /[^\S\r\n]+$/).exec(labelText.text);
  const range = match
    ? ([
        isStart ? labelText.startColumn : labelText.endColumn - match[0].length,
        match[0].length,
      ] as const)
    : undefined;
  const line = isStart
    ? labelText.startLine + (match ? 0 : 1)
    : labelText.endLine - (match ? 0 : 1);
  ctx.onError({
    line,
    column: range?.[0],
    context: label.text.replace(/\s+/g, ' '),
    fixInfo: range
      ? {
          lineNumber: line,
          editColumn: range[0],
          deleteCount: range[1],
        }
      : undefined,
  });
}

export const noSpaceInLinks: TokenRule = {
  name: 'no-space-in-links',
  tags: ['whitespace', 'links'],
  fixable: true,
  defaults: {
    message: 'Spaces inside link text',
  },
  check(ctx) {
    const labels = filterByTypes(ctx.tree, ['label']).filter(
      (label) => label.parent?.type === 'link'
    );
    for (const label of labels) {
      const labelTexts = label.children.filter((child) => child.type === 'labelText');
      for (const labelText of labelTexts) {
        if (labelText.text.trimStart().length !== labelText.text.length) {
          addLabelSpaceError(ctx, label, labelText, true);
        }
        if (labelText.text.trimEnd().length !== labelText.text.length) {
          addLabelSpaceError(ctx, label, labelText, false);
        }
      }
    }
  },
};
