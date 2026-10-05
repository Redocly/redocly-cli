import { yellow } from 'colorette';

import { cleanColors } from './miscellaneous.js';

const INDENT = '    ';
const PADDING = '  ';

export function renderBanner(messageLines: string[]): string {
  const contentWidth = Math.max(...messageLines.map((line) => cleanColors(line).length));
  const innerWidth = contentWidth + PADDING.length * 2;
  const emptyLine = INDENT + yellow('║' + ' '.repeat(innerWidth) + '║');

  return [
    '',
    INDENT + yellow('╔' + '═'.repeat(innerWidth) + '╗'),
    emptyLine,
    ...messageLines.map((line) => {
      const rightPadding = ' '.repeat(contentWidth - cleanColors(line).length);
      return `${INDENT}${yellow('║')}${PADDING}${line}${rightPadding}${PADDING}${yellow('║')}`;
    }),
    emptyLine,
    INDENT + yellow('╚' + '═'.repeat(innerWidth) + '╝'),
    '',
    '',
  ].join('\n');
}
