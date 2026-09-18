import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md022.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import { getBlockQuotePrefixText, getHeadingLevel, isBlankLine } from './helpers.js';

const defaultLines = 1;

type LinesGetter = (heading: Token) => number;

/**
 * Upstream's `getLinesFunction`: `linesAbove`/`linesBelow` config can be a
 * single number applied to every heading level, or a `number[6]` (one
 * entry per heading level 1-6, missing/short entries fall back to the
 * default of 1).
 */
function getLinesFunction(linesParam: unknown): LinesGetter {
  if (Array.isArray(linesParam)) {
    const linesArray = new Array(6).fill(defaultLines) as number[];
    for (const [index, value] of linesParam.slice(0, 6).entries()) {
      linesArray[index] = Number(value);
    }
    return (heading) => linesArray[getHeadingLevel(heading) - 1];
  }
  const lines = linesParam === undefined ? defaultLines : Number(linesParam);
  return () => lines;
}

/**
 * Gets a 0-based line's text for the "lines above" scan. Upstream strips
 * front matter out of `params.lines` entirely and only reconstructs it via
 * a separate `frontMatterLines` array for negative indices; Recheck keeps
 * front matter in-band as a real `yaml` token occupying real line numbers
 * in `ctx.lines`. To preserve upstream's documented default ("front matter
 * is ignored" — i.e. no blank line is required between it and the first
 * heading), a line that falls inside the yaml token's span is treated as
 * blank (returns `''`) unless `includeFrontMatter` is set, in which case
 * its real text is returned like any other line.
 */
function getLineAbove(
  lines: string[],
  index: number,
  frontMatterRange: { start: number; end: number } | undefined,
  includeFrontMatter: boolean
): string {
  if (index < 0 || index >= lines.length) return '';
  const lineNumber = index + 1;
  if (
    !includeFrontMatter &&
    frontMatterRange &&
    lineNumber >= frontMatterRange.start &&
    lineNumber <= frontMatterRange.end
  ) {
    return '';
  }
  return lines[index];
}

export const blanksAroundHeadings: TokenRule = {
  name: 'blanks-around-headings',
  tags: ['headings', 'blank_lines'],
  fixable: true,
  defaults: {
    message: 'Headings should be surrounded by blank lines',
    includeFrontMatter: false,
    linesAbove: 1,
    linesBelow: 1,
  },
  check(ctx) {
    const getLinesAbove = getLinesFunction(ctx.config.linesAbove);
    const getLinesBelow = getLinesFunction(ctx.config.linesBelow);
    const includeFrontMatter = !!ctx.config.includeFrontMatter;
    const { lines } = ctx;
    const frontmatter = ctx.tree.flat.find((token) => token.type === 'yaml');
    const frontMatterRange = frontmatter
      ? { start: frontmatter.startLine, end: frontmatter.endLine }
      : undefined;

    for (const heading of filterByTypes(ctx.tree, ['atxHeading', 'setextHeading'])) {
      const { startLine, endLine } = heading;
      const lineText = (lines[startLine - 1] ?? '').trim();

      const linesAbove = getLinesAbove(heading);
      if (linesAbove >= 0) {
        let actualAbove = 0;
        for (
          let i = 0;
          i < linesAbove &&
          isBlankLine(getLineAbove(lines, startLine - 2 - i, frontMatterRange, includeFrontMatter));
          i++
        ) {
          actualAbove++;
        }
        if (linesAbove !== actualAbove) {
          ctx.onError({
            line: startLine,
            detail: `Expected: ${linesAbove}; Actual: ${actualAbove}; Above`,
            context: lineText,
            fixInfo: {
              lineNumber: startLine,
              editColumn: 1,
              insertText: getBlockQuotePrefixText(
                ctx.tree,
                startLine - 1,
                linesAbove - actualAbove
              ),
            },
          });
        }
      }

      const linesBelow = getLinesBelow(heading);
      if (linesBelow >= 0) {
        let actualBelow = 0;
        for (let i = 0; i < linesBelow && isBlankLine(lines[endLine + i] ?? ''); i++) {
          actualBelow++;
        }
        if (linesBelow !== actualBelow) {
          ctx.onError({
            line: startLine,
            detail: `Expected: ${linesBelow}; Actual: ${actualBelow}; Below`,
            context: lineText,
            fixInfo: {
              lineNumber: endLine + 1,
              editColumn: 1,
              insertText: getBlockQuotePrefixText(ctx.tree, endLine + 1, linesBelow - actualBelow),
            },
          });
        }
      }
    }
  },
};
