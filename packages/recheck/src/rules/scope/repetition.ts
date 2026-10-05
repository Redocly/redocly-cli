import { overlapsAnyRange } from '../../core/inline-code.js';
import { newLineRe, offsetToLineColumn } from '../../core/line-endings.js';
import type { ScopedSegment } from '../../scopes/types.js';
import type { NormalizedRule, Problem, Fix, RepetitionAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';
import { nonProseRanges } from '../utils.js';

interface Token {
  text: string;
  index: number; // 0-based offset into segment.content
}

interface RepeatedPair {
  first: Token;
  second: Token;
}

// Splits the content into tokens with `options.pattern` (default `\w+`) and
// pairs equal neighbours separated only by whitespace, with at most one line
// break (never across a blank line). Tokens inside code spans or markdoc tags
// are dropped (`includeCode` keeps code spans), so `next-line line-length`
// in a code span is not a repeat.
function findRepeatedPairs(segment: ScopedSegment, options: RepetitionAssertion): RepeatedPair[] {
  let tokenRe: RegExp;
  try {
    tokenRe = new RegExp(options.pattern ?? '\\w+', 'g');
  } catch {
    return []; // ignore invalid regex
  }

  const excluded = nonProseRanges(segment, options.includeCode);
  const tokens: Token[] = [];
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(segment.content)) !== null) {
    // Skip empty matches and advance lastIndex so the loop does not hang.
    if (match[0].length === 0) {
      tokenRe.lastIndex++;
      continue;
    }
    if (overlapsAnyRange(match.index, match.index + match[0].length, excluded)) continue;
    tokens.push({ text: match[0], index: match.index });
  }

  // Case is ignored by default, so 'The the' is caught.
  const ignoreCase = options.ignoreCase !== false;

  const pairs: RepeatedPair[] = [];
  for (let i = 1; i < tokens.length; i++) {
    const first = tokens[i - 1];
    const second = tokens[i];
    const gap = segment.content.slice(first.index + first.text.length, second.index);
    if (!/^\s+$/.test(gap)) continue;
    const lineBreaksInGap = gap.match(newLineRe)?.length ?? 0;
    if (lineBreaksInGap > 1) continue;
    const same = ignoreCase
      ? first.text.toLowerCase() === second.text.toLowerCase()
      : first.text === second.text;
    if (same) pairs.push({ first, second });
  }
  return pairs;
}

// On the first line, `segment.content` can start mid-line (a heading excludes
// its '## '), so add `startColumn` to get the real column.
function toSourceColumn(segment: { startColumn: number }, localLine: number, localColumn: number) {
  return localLine === 1 ? segment.startColumn + (localColumn - 1) : localColumn;
}

const execute = async (
  rule: NormalizedRule,
  file: string,
  ctx: ScopeRuleContext
): Promise<Problem[]> => {
  const options = rule.assertions['repetition'] as RepetitionAssertion;
  const problems: Problem[] = [];

  for (const segment of ctx.segments) {
    const contentLines = segment.content.split(newLineRe);
    for (const { second } of findRepeatedPairs(segment, options)) {
      // Reported at the second token, which is what fix() removes.
      const { line: localLine, column: localColumn } = offsetToLineColumn(
        segment.content,
        second.index
      );
      problems.push({
        file,
        line: segment.startLine + localLine - 1,
        column: toSourceColumn(segment, localLine, localColumn),
        text: contentLines[localLine - 1] ?? '',
        match: second.text,
        ruleName: rule.name,
        severity: rule.severity,
        message: formatTemplate(rule.message ?? 'Repeated word "%s".', second.text),
      });
    }
  }

  return problems;
};

const fix = async (rule: NormalizedRule, file: string, ctx: ScopeRuleContext): Promise<Fix[]> => {
  const options = rule.assertions['repetition'] as RepetitionAssertion;
  const fixes: Fix[] = [];
  // Full source lines, used to check whether the token is alone on its line.
  const fileLines = ctx.content.split(newLineRe);

  for (const segment of ctx.segments) {
    for (const { first, second } of findRepeatedPairs(segment, options)) {
      const firstPos = offsetToLineColumn(segment.content, first.index);
      const secondPos = offsetToLineColumn(segment.content, second.index);

      if (firstPos.line === secondPos.line) {
        // Same line: delete the gap and the second token, so 'The the' becomes 'The'.
        const gapLength = second.index - (first.index + first.text.length);
        fixes.push({
          file,
          ruleName: rule.name,
          lineNumber: segment.startLine + secondPos.line - 1,
          editColumn: toSourceColumn(segment, firstPos.line, firstPos.column) + first.text.length,
          deleteCount: gapLength + second.text.length,
        });
      } else {
        // Different lines: a fix can only edit one line, so delete the second
        // token and the whitespace after it on its line.
        const lineNumber = segment.startLine + secondPos.line - 1;
        const editColumn = toSourceColumn(segment, secondPos.line, secondPos.column);

        // Check the full source line; a segment can end mid-line.
        const sourceLine = fileLines[lineNumber - 1] ?? '';
        const beforeToken = sourceLine.slice(0, editColumn - 1);
        const afterOnSourceLine = sourceLine.slice(editColumn - 1 + second.text.length);
        if (/^\s*$/.test(beforeToken) && /^\s*$/.test(afterOnSourceLine)) {
          // The token is alone on its line, so delete the whole line (deleteCount: -1).
          fixes.push({
            file,
            ruleName: rule.name,
            lineNumber,
            deleteCount: -1,
          });
          continue;
        }

        const lines = segment.content.split(newLineRe);
        const lineText = lines[secondPos.line - 1] ?? '';
        const afterToken = lineText.slice(secondPos.column - 1 + second.text.length);
        const trailingWhitespace = /^\s*/.exec(afterToken)?.[0] ?? '';
        fixes.push({
          file,
          ruleName: rule.name,
          lineNumber,
          editColumn,
          deleteCount: second.text.length + trailingWhitespace.length,
        });
      }
    }
  }

  return fixes;
};

export const repetition: ScopeRule = { id: 'repetition', fixable: true, execute, fix };
