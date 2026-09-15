import { newLineRe, offsetToLineColumn } from '../../core/line-endings.js';
import type { NormalizedRule, Problem, Fix, RepetitionAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

interface Token {
  text: string;
  index: number; // 0-based offset into segment.content
}

interface RepeatedPair {
  first: Token;
  second: Token;
}

// Tokenizes `segment.content` with `options.pattern` (default `\w+`) and
// pairs adjacent tokens whose only separator is whitespace with at most one
// line break (a blank line never pairs across paragraphs), matched
// case-insensitively unless `ignoreCase: false`. Shared by execute() and fix().
function findRepeatedPairs(
  segment: { content: string },
  options: RepetitionAssertion
): RepeatedPair[] {
  let tokenRe: RegExp;
  try {
    tokenRe = new RegExp(options.pattern ?? '\\w+', 'g');
  } catch {
    return []; // ignore invalid regex
  }

  const tokens: Token[] = [];
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(segment.content)) !== null) {
    // A pattern that can match empty (e.g. `\w*`) must advance lastIndex or
    // the loop hangs; the empty token itself is skipped -- an empty "word"
    // can't meaningfully repeat.
    if (match[0].length === 0) {
      tokenRe.lastIndex++;
      continue;
    }
    tokens.push({ text: match[0], index: match.index });
  }

  // Defaults TRUE (unlike every other assertion): 'The the' is the common
  // typo this check exists to catch.
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

// On the segment's first line, segment.content starts mid-source-line (e.g.
// a heading's content excludes the '## ' marker), so segment.startColumn
// must be added -- see pattern.ts's toSourceColumn.
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
      // Reported at the SECOND token's position -- exactly what fix() removes.
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
  // Full source lines, for the lone-token whole-line-deletion check below.
  const fileLines = ctx.content.split(newLineRe);

  for (const segment of ctx.segments) {
    for (const { first, second } of findRepeatedPairs(segment, options)) {
      const firstPos = offsetToLineColumn(segment.content, first.index);
      const secondPos = offsetToLineColumn(segment.content, second.index);

      if (firstPos.line === secondPos.line) {
        // Same-line pair: delete the gap plus the second token, so the
        // first token survives verbatim, casing included ('The the' -> 'The').
        const gapLength = second.index - (first.index + first.text.length);
        fixes.push({
          file,
          ruleName: rule.name,
          lineNumber: segment.startLine + secondPos.line - 1,
          editColumn: toSourceColumn(segment, firstPos.line, firstPos.column) + first.text.length,
          deleteCount: gapLength + second.text.length,
        });
      } else {
        // Cross-line (hard-wrapped) pair: a single Fix can only edit one
        // source line (see core/auto-fix.ts), so only the second token's
        // line is rewritten -- deleting the token plus the whitespace run
        // following it on that line.
        const lineNumber = segment.startLine + secondPos.line - 1;
        const editColumn = toSourceColumn(segment, secondPos.line, secondPos.column);

        // Checked against the full SOURCE line, not the segment-content
        // slice: a segment can end mid-line (e.g. a sentence segment), and
        // whole-line deletion must never eat source text outside it.
        const sourceLine = fileLines[lineNumber - 1] ?? '';
        const beforeToken = sourceLine.slice(0, editColumn - 1);
        const afterOnSourceLine = sourceLine.slice(editColumn - 1 + second.text.length);
        if (/^\s*$/.test(beforeToken) && /^\s*$/.test(afterOnSourceLine)) {
          // The duplicate token is alone on its line -- deleting just the
          // token would leave an empty line behind, so delete the whole
          // line instead (deleteCount: -1, see core/auto-fix.ts).
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
