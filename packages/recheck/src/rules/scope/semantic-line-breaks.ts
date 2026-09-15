import { newLineRe } from '../../core/line-endings.js';
import { filterByTypes } from '../../parser/index.js';
import { splitSentences } from '../../scopes/sentences.js';
import type {
  Problem,
  NormalizedRule,
  Fix,
  SemanticLineBreaksAssertion,
} from '../../types/index.js';
import { addRangeToSet } from '../token/helpers.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

// One real CommonMark list marker with its required spacing. The spacing
// keeps prose starting with emphasis (`*text*`), a non-list dash
// (`-3 degrees`), or a decimal (`1.5 million`) out of this match. Lettered
// markers (`a.`) are absent: micromark never parses them as lists.
const SINGLE_MARKER_RE = /^(?:[-*+]|\d+\.)[ \t]+/;

// Lettered pseudo-markers (`- a. Text`): splitSentences reads `a.` as a
// sentence boundary and --fix would sever it from its own text. They are
// not CommonMark markers, so they cannot be stripped like nested numbered
// markers; the whole line is skipped instead.
const PSEUDO_MARKER_RE = /^[a-zA-Z]\.[ \t]/;

// Length of the whole list-marker prefix: blockquote markers, indent, then
// every directly nested real marker (`- 1. text` consumes `- 1. `). Nested
// markers strip iteratively so whole-file runs and scoped runs (which get
// outer markers pre-stripped by token boundaries) reduce to the same text.
function listMarkerLength(lineText: string): number {
  const prefix = lineText.match(/^\s*(?:>\s*)*/)?.[0].length ?? 0;
  let length = prefix;
  let marker = lineText.slice(length).match(SINGLE_MARKER_RE);
  if (!marker) return 0;
  while (marker) {
    length += marker[0].length;
    marker = lineText.slice(length).match(SINGLE_MARKER_RE);
  }
  return length;
}

function isSkippableLine(lineText: string): boolean {
  if (lineText.trim() === '' || lineText.startsWith('#')) return true;
  const markerLength = listMarkerLength(lineText);
  if (markerLength > 0) return PSEUDO_MARKER_RE.test(lineText.slice(markerLength));
  return /^\s*[a-zA-Z]\.\s/.test(lineText);
}

function calculateContinuationIndent(line: string): string {
  // Peel off the blockquote prefix first: leading whitespace plus one or
  // more '>' markers (each optionally followed by whitespace). It is kept
  // VERBATIM on continuation lines -- unlike list markers below, a
  // blockquote marker replaced by spaces would demote the split-off
  // sentences to lazy continuation lines, which still render inside the
  // blockquote but no longer read as part of it in the source (the whole
  // point of semantic line breaks). Lines without any '>' marker leave
  // `blockquotePrefix` empty and take the exact pre-existing code path
  // below, so non-blockquote continuation output is unchanged byte-for-byte.
  const blockquotePrefix = line.match(/^(\s*(?:>\s*)+)/)?.[1] ?? '';
  const remainder = line.slice(blockquotePrefix.length);

  const leadingWhitespace = remainder.match(/^(\s*)/)?.[1] || '';

  // Markers must not repeat on continuation lines (that would create new
  // list items), so they are replaced by spaces of equal width. They
  // consume iteratively, matching listMarkerLength, so a nested `- 1. text`
  // line aligns its continuation under `text`.
  const listMarkers = [
    /^(\s*[-*+]\s)/, // Bullet points (all three CommonMark markers, matching isSkippableLine)
    /^(\s*\d+\.\s)/, // Numbered lists
    /^(\s*[a-zA-Z]\.\s)/, // Letter lists
  ];

  let markerRegionWidth = 0;
  let consumed = true;
  while (consumed) {
    consumed = false;
    for (const pattern of listMarkers) {
      const match = remainder.slice(markerRegionWidth).match(pattern);
      if (match) {
        markerRegionWidth += match[1].length;
        consumed = true;
        break;
      }
    }
  }
  if (markerRegionWidth > 0) {
    return blockquotePrefix + ' '.repeat(markerRegionWidth);
  }

  return blockquotePrefix + leadingWhitespace;
}

// Shared by execute() and fix() so both apply the exact same gate: with
// mode !== 'sentence' (e.g. 'phrase'), this rule doesn't detect anything
// today, so fix() must not rewrite lines either -- previously fix() split
// every multi-sentence line unconditionally regardless of `mode`, letting
// --fix rewrite lines lint never flagged under a non-'sentence' mode.
function isSentenceMode(options: SemanticLineBreaksAssertion): boolean {
  return options.mode === 'sentence';
}

function formatMessage(template: string, ...args: string[]): string {
  let result = template;
  for (let i = 0; i < args.length; i++) {
    result = result.replace('%s', args[i]);
  }
  return result;
}

/**
 * Line numbers (1-based) that fall inside a real fenced/indented code block
 * or a real GFM table, derived once from the whole document's token tree --
 * the same whole-file self-derivation pattern `line-length.ts` (MD013) uses
 * for its own `codeBlocks`/`tables` options. Replaces the old per-line
 * ``` ` ``` -toggle and `line.includes('|')` heuristics: those only caught
 * backtick-fenced blocks (never tilde fences or indented code) and treated
 * ANY line containing a literal `|` as a table (a false positive for, e.g.,
 * prose mentioning `true|false` or a shell `foo | bar` pipeline outside any
 * table). Computed over `ctx.tree` regardless of the rule's own scope
 * selector, since a code/table token's true extent doesn't depend on which
 * segments this invocation happens to be scoped to.
 */
function deriveIgnoredLineNumbers(ctx: ScopeRuleContext): {
  codeBlockLines: Set<number>;
  tableLines: Set<number>;
} {
  const codeBlockLines = new Set<number>();
  for (const codeBlock of filterByTypes(ctx.tree, ['codeFenced', 'codeIndented'])) {
    addRangeToSet(codeBlockLines, codeBlock.startLine, codeBlock.endLine);
  }
  const tableLines = new Set<number>();
  for (const table of filterByTypes(ctx.tree, ['table'])) {
    addRangeToSet(tableLines, table.startLine, table.endLine);
  }
  return { codeBlockLines, tableLines };
}

/**
 * The single skip-decision used by both `execute` and `fix`. `fix()` must
 * never rewrite a line that `execute()` wouldn't have flagged in the first
 * place -- previously `fix()` only checked for blank lines and '#'
 * headings, missing the tree-derived codeBlockLines/tableLines gating (and
 * `isSkippableLine` entirely), so --fix could rewrite lines lint never
 * reported as problems (e.g. an indented code-block line, or a table row).
 */
function isIgnoredLine(
  lineText: string,
  lineNumber: number,
  options: SemanticLineBreaksAssertion,
  ignoredLines: { codeBlockLines: Set<number>; tableLines: Set<number> }
): boolean {
  if (options.ignoreCodeBlocks && ignoredLines.codeBlockLines.has(lineNumber)) return true;
  if (options.ignoreTables && ignoredLines.tableLines.has(lineNumber)) return true;
  return isSkippableLine(lineText);
}

const execute = async (
  rule: NormalizedRule,
  file: string,
  ctx: ScopeRuleContext
): Promise<Problem[]> => {
  const problems: Problem[] = [];
  const options = rule.assertions['semantic-line-breaks'] as SemanticLineBreaksAssertion;
  const ignoredLines = deriveIgnoredLineNumbers(ctx);

  for (const segment of ctx.segments) {
    const lines = segment.content.split(newLineRe);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const lineText = lines[lineIndex];
      const lineNumber = segment.startLine + lineIndex;

      if (isIgnoredLine(lineText, lineNumber, options, ignoredLines)) continue;

      if (isSentenceMode(options)) {
        // Count sentences after the marker: an ordered marker's own `1.`
        // would otherwise register as a sentence boundary.
        const sentenceCount = splitSentences(lineText.slice(listMarkerLength(lineText))).length;
        if (sentenceCount > 1) {
          problems.push({
            file,
            line: lineNumber,
            column: 1,
            text: lineText,
            match: lineText,
            ruleName: rule.name,
            severity: rule.severity,
            message: formatMessage(rule.message ?? '', options.mode),
          });
        }
      }
    }
  }

  return problems;
};

const fix = async (rule: NormalizedRule, file: string, ctx: ScopeRuleContext): Promise<Fix[]> => {
  const fixes: Fix[] = [];
  const options = rule.assertions['semantic-line-breaks'] as SemanticLineBreaksAssertion;
  if (!isSentenceMode(options)) return fixes;
  const ignoredLines = deriveIgnoredLineNumbers(ctx);
  const rawLines = ctx.content.split(newLineRe);

  for (const segment of ctx.segments) {
    const lines = segment.content.split(newLineRe);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const lineText = lines[lineIndex];
      const lineNumber = segment.startLine + lineIndex;

      if (isIgnoredLine(lineText, lineNumber, options, ignoredLines)) continue;

      // Same marker strip as execute(); markerLength shifts the sentence
      // spans back to line positions.
      const markerLength = listMarkerLength(lineText);
      const sentences = splitSentences(lineText.slice(markerLength));
      if (sentences.length <= 1) continue;

      // The replacement is applied with deleteCount: -1 (whole-line
      // replace), so it must be rebuilt from the RAW source line, never
      // from segment.content: under a scoped run (scope: summary /
      // list-item / default) a list item's segment content is the SEMANTIC
      // text with the list marker stripped by the token boundaries (the
      // item's `content` token starts after the `- ` prefix), and
      // rebuilding from it would replace `- First. Second.` with
      // marker-less `First.\nSecond.`, corrupting the list. Sentence
      // DETECTION stays on lineText -- the exact text execute() flags -- so
      // execute()/fix() symmetry is untouched; only the replacement text
      // derives from the raw line. On the segment's first line the token's
      // startColumn locates the segment text within the raw line; later
      // segment lines are verbatim source slices already (token text is
      // content.slice(start.offset, end.offset)), and the whole-file
      // segment has startColumn 1 -- both leave prefixOffset at 0, keeping
      // whole-file (scope: all / unscoped) output byte-identical to before.
      const rawLine = rawLines[lineNumber - 1] ?? lineText;
      const prefixOffset = lineIndex === 0 ? segment.startColumn - 1 : 0;
      const indentation = calculateContinuationIndent(rawLine);

      const [firstSentence, ...continuationSentences] = sentences;
      // Reconstruct the first sentence line from the TRUE original prefix
      // (everything in the raw line before the trimmed sentence content
      // starts -- indentation, blockquote markers, a list marker), not from
      // `firstSentence.text` alone: splitSentences trims each span, so pure
      // leading whitespace on the line is gone from `.text` with nowhere to
      // go back to. Continuation lines are unaffected -- they were never
      // built from the original line's own prefix in the first place.
      const firstLinePrefix = rawLine.slice(0, prefixOffset + markerLength + firstSentence.start);
      const newLinesForThisLine = [
        firstLinePrefix + firstSentence.text,
        ...continuationSentences.map((sentence) => indentation + sentence.text),
      ];

      const newText = newLinesForThisLine.join('\n');

      fixes.push({
        file,
        ruleName: rule.name,
        lineNumber,
        editColumn: 1,
        deleteCount: -1,
        insertText: newText,
      });
    }
  }

  return fixes;
};

export const semanticLineBreaks: ScopeRule = {
  id: 'semantic-line-breaks',
  fixable: true,
  execute,
  fix,
};
