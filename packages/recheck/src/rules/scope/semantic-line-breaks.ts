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

// One CommonMark list marker plus the space after it. The space keeps `*text*`,
// `-3 degrees` and `1.5 million` from matching. Lettered markers (`a.`) are not
// list markers in CommonMark.
const SINGLE_MARKER_RE = /^(?:[-*+]|\d+\.)[ \t]+/;

// Lettered markers (`- a. Text`): splitSentences treats `a.` as a sentence end,
// so --fix would split it from its text. These lines are skipped.
const PSEUDO_MARKER_RE = /^[a-zA-Z]\.[ \t]/;

// Length of the prefix before the text: blockquote markers, indent and every
// nested list marker (`- 1. text` gives the length of `- 1. `).
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
  // Keep the blockquote prefix as it is on continuation lines. Replacing '>'
  // with spaces would turn them into lazy continuation lines, which no longer
  // look like part of the quote in the source.
  const blockquotePrefix = line.match(/^(\s*(?:>\s*)+)/)?.[1] ?? '';
  const remainder = line.slice(blockquotePrefix.length);

  const leadingWhitespace = remainder.match(/^(\s*)/)?.[1] || '';

  // A marker must not repeat on continuation lines (that would start a new list
  // item), so replace each one with spaces of the same width.
  const listMarkers = [
    /^(\s*[-*+]\s)/, // Bullet points
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

// Only 'sentence' mode reports problems, so fix() must only run in that mode too.
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

/** Finds the 1-based line numbers inside code blocks and tables, using the whole file's tree. */
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

/** Shared by `execute` and `fix` so --fix never changes a line that lint skips. */
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
        // Count sentences after the marker; `1.` would look like a sentence end.
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

      // markerLength shifts the sentence positions back to positions in the line.
      const markerLength = listMarkerLength(lineText);
      const sentences = splitSentences(lineText.slice(markerLength));
      if (sentences.length <= 1) continue;

      // The whole line is replaced, so build the new text from the raw source
      // line. A scoped segment may not include the list marker, and `- First. Second.`
      // would lose its `- `. On the first line, startColumn tells where the segment starts.
      const rawLine = rawLines[lineNumber - 1] ?? lineText;
      const prefixOffset = lineIndex === 0 ? segment.startColumn - 1 : 0;
      const indentation = calculateContinuationIndent(rawLine);

      const [firstSentence, ...continuationSentences] = sentences;
      // Keep the original prefix (indentation, '>' and list marker) on the first line,
      // because splitSentences trims leading whitespace from each sentence.
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
