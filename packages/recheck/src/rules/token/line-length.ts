import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md013.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
import type { TokenRule } from '../types.js';
import { addRangeToSet, getDescendantsByType, getFrontmatterEndLine } from './helpers.js';

// Regular expression for a line that is not wrappable.
const notWrappableRe = /^(?:[#>\s]*\s)?\S*$/;

export const lineLength: TokenRule = {
  name: 'line-length',
  tags: ['line_length'],
  fixable: false,
  defaults: {
    message: 'Line length',
    lineLength: 80,
    // headingLineLength/codeBlockLineLength are declared here with an
    // `undefined` value (rather than omitted entirely) so validate()'s
    // accepted-option allowlist -- built from `Object.keys(tokenRule.defaults)`
    // -- knows about them (Object.keys includes keys whose value is
    // `undefined`; it's only OWN ENUMERABLE PRESENCE that matters, not
    // truthiness). They intentionally have NO literal *value* default here
    // (unlike upstream's doc table, which lists 80 for clarity): both fall
    // back to whatever `lineLength` resolves to, and Recheck's runner
    // pre-merges `defaults` into `ctx.config` before user options
    // (`{...tokenRule.defaults, ...assertionOptions}`), so a literal `80`
    // here would permanently shadow a user-configured `lineLength` override
    // for headings/code blocks. An explicit `undefined` default doesn't
    // have that problem -- the user's spread always wins when they set a
    // value, and `ctx.config.headingLineLength`/`codeBlockLineLength` stay
    // `undefined` (falling through to `lineLengthOption` below, exactly
    // like today) when they don't -- matching upstream's own
    // `params.config.heading_line_length === undefined` fallback check.
    headingLineLength: undefined,
    codeBlockLineLength: undefined,
    strict: false,
    stern: false,
    codeBlocks: true,
    tables: true,
    headings: true,
  },
  // oxlint-disable-next-line sonarjs/cognitive-complexity -- ported from the source engine, written and reviewed against that repo's threshold of 100 (this repo's default is 30); needs a dedicated refactor or a per-package override, not a same-task rewrite of correctness-critical rule logic.
  check(ctx) {
    const lineLengthOption = Number(ctx.config.lineLength || 80);
    const headingLineLength = Number(ctx.config.headingLineLength || lineLengthOption);
    const codeLineLength = Number(ctx.config.codeBlockLineLength || lineLengthOption);
    const strict = !!ctx.config.strict;
    const stern = !!ctx.config.stern;
    const includeCodeBlocks = ctx.config.codeBlocks === undefined ? true : !!ctx.config.codeBlocks;
    const includeTables = ctx.config.tables === undefined ? true : !!ctx.config.tables;
    const includeHeadings = ctx.config.headings === undefined ? true : !!ctx.config.headings;

    const headingLineNumbers = new Set<number>();
    for (const heading of filterByTypes(ctx.tree, ['atxHeading', 'setextHeading'])) {
      addRangeToSet(headingLineNumbers, heading.startLine, heading.endLine);
    }
    const codeBlockLineNumbers = new Set<number>();
    for (const codeBlock of filterByTypes(ctx.tree, ['codeFenced', 'codeIndented'])) {
      addRangeToSet(codeBlockLineNumbers, codeBlock.startLine, codeBlock.endLine);
    }
    const tableLineNumbers = new Set<number>();
    for (const table of filterByTypes(ctx.tree, ['table'])) {
      addRangeToSet(tableLineNumbers, table.startLine, table.endLine);
    }
    const linkLineNumbers = new Set<number>();
    for (const link of filterByTypes(ctx.tree, ['autolink', 'image', 'link', 'literalAutolink'])) {
      addRangeToSet(linkLineNumbers, link.startLine, link.endLine);
    }
    const paragraphDataLineNumbers = new Set<number>();
    for (const paragraph of filterByTypes(ctx.tree, ['paragraph'])) {
      for (const data of getDescendantsByType(paragraph, ['data'])) {
        addRangeToSet(paragraphDataLineNumbers, data.startLine, data.endLine);
      }
    }
    const linkOnlyLineNumbers = new Set<number>();
    for (const lineNumber of linkLineNumbers) {
      if (!paragraphDataLineNumbers.has(lineNumber)) {
        linkOnlyLineNumbers.add(lineNumber);
      }
    }
    // Narrow port of upstream's getReferenceLinkImageData().definitionLineIndices:
    // only the `definition`/`gfmFootnoteDefinition` token line ranges feed that
    // array (see helpers.cjs around getReferenceLinkImageData's `definition`
    // case) -- the label-string token types populate `definitions`, not
    // `definitionLineIndices`, so they're not needed here.
    const definitionLineIndices = new Set<number>();
    for (const definition of filterByTypes(ctx.tree, ['definition', 'gfmFootnoteDefinition'])) {
      for (let line = definition.startLine; line <= definition.endLine; line++) {
        definitionLineIndices.add(line - 1);
      }
    }

    // See getFrontmatterEndLine's doc comment: upstream markdownlint slices
    // frontmatter out of `params.lines` entirely before any rule runs, so
    // MD013 never sees frontmatter lines no matter how long. Recheck's
    // parser keeps frontmatter as real lines in `ctx.lines` instead, so
    // they must be excluded here explicitly.
    const frontmatterEndLine = getFrontmatterEndLine(ctx.tree);

    for (let lineIndex = 0; lineIndex < ctx.lines.length; lineIndex++) {
      const lineNumber = lineIndex + 1;
      if (lineNumber <= frontmatterEndLine) continue;
      const line = ctx.lines[lineIndex];
      const isHeading = headingLineNumbers.has(lineNumber);
      const inCode = codeBlockLineNumbers.has(lineNumber);
      const inTable = tableLineNumbers.has(lineNumber);
      const maxLength = inCode ? codeLineLength : isHeading ? headingLineLength : lineLengthOption;
      // If not strict/stern, the last run of non-whitespace is allowed to go
      // beyond the limit as long as it begins within the limit.
      const text = strict || stern ? line : line.replace(/\S*$/u, '#');
      if (
        maxLength > 0 &&
        (includeCodeBlocks || !inCode) &&
        (includeTables || !inTable) &&
        (includeHeadings || !isHeading) &&
        !definitionLineIndices.has(lineIndex) &&
        (strict ||
          (!(stern && notWrappableRe.test(line)) && !linkOnlyLineNumbers.has(lineNumber))) &&
        text.length > maxLength
      ) {
        ctx.onError({
          line: lineNumber,
          column: maxLength + 1,
          detail: `Expected: ${maxLength}; Actual: ${line.length}`,
        });
      }
    }
  },
};
