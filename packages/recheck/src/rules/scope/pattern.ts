import { overlapsAnyRange } from '../../core/inline-code.js';
import { newLineRe, offsetToLineColumn } from '../../core/line-endings.js';
import type { Problem, NormalizedRule, PatternAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';
import { nonProseRanges } from '../utils.js';

// On the first line, `segment.content` can start mid-line (a heading excludes
// its '## '), so add `startColumn` to get the real column.
function toSourceColumn(segment: { startColumn: number }, lineNumber: number, column: number) {
  return lineNumber === 1 ? segment.startColumn + (column - 1) : column;
}

const execute = async (
  rule: NormalizedRule,
  file: string,
  ctx: ScopeRuleContext
): Promise<Problem[]> => {
  const problems: Problem[] = [];
  const options = rule.assertions['pattern'] as PatternAssertion;

  for (const segment of ctx.segments) {
    const content = segment.content;
    // Split on newLineRe so CRLF content does not keep a trailing '\r'.
    const contentLines = content.split(newLineRe);
    // Code spans and markdoc tags are not prose, so matches that overlap them are
    // skipped (`includeCode` keeps code spans). The regex runs on the original
    // content because a pattern like `[^\s,]+` could match through masked text.
    const excluded = nonProseRanges(segment, options.includeCode);
    const tokens: string[] = options.tokens || [];
    for (const token of tokens) {
      try {
        const regex = new RegExp(token, options.ignoreCase ? 'gi' : 'g');
        let match: RegExpExecArray | null;
        while ((match = regex.exec(content)) !== null) {
          // Skip empty matches (e.g. `a*`) and advance lastIndex so the loop does not hang.
          if (match[0].length === 0) {
            regex.lastIndex++;
            continue;
          }
          const matchEnd = match.index + match[0].length;
          if (overlapsAnyRange(match.index, matchEnd, excluded)) {
            continue;
          }
          const { line: lineNumber, column } = offsetToLineColumn(content, match.index);
          const matchedText = content.slice(match.index, match.index + match[0].length);
          problems.push({
            file,
            line: segment.startLine + lineNumber - 1,
            column: toSourceColumn(segment, lineNumber, column),
            text: contentLines[lineNumber - 1] || '',
            match: matchedText,
            ruleName: rule.name,
            severity: rule.severity,
            message: formatTemplate(rule.message ?? '', matchedText),
          });
        }
      } catch {
        // ignore invalid regex
      }
    }
  }

  return problems;
};

export const pattern: ScopeRule = { id: 'pattern', fixable: false, execute };
