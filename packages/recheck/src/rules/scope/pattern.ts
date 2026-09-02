import { overlapsAnyRange } from '../../core/inline-code.js';
import { newLineRe, offsetToLineColumn } from '../../core/line-endings.js';
import type { Problem, NormalizedRule, PatternAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';
import { nonProseRanges } from '../utils.js';

// A match's raw `column` (from offsetToLineColumn) is relative to its own
// line within segment.content. On the segment's first line,
// segment.content starts mid-source-line (e.g. a heading segment's
// content excludes the '## ' marker), so segment.startColumn must be added
// to get the true source column. Matches on later lines start at source
// column 1, so they're unaffected.
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
    // newLineRe (never a bare '\n'): a '\n' split of CRLF content leaves a
    // trailing '\r' on every reported `text`, and a '\n'-based line count
    // keeps CR-only matches on line 1 (see offsetToLineColumn below).
    const contentLines = content.split(newLineRe);
    // Prose rules must not lint code: a token like 'master' would fire
    // inside `git checkout master`, the usage Google's guide explicitly
    // sanctions in code font. A markdoc tag's span is excluded on the same
    // terms: it is markup, not the prose this rule was pointed at. The regex
    // runs against the original `content`, never a masked stand-in, because an
    // arbitrary user regex such as the negated class `[^\s,]+` can match
    // straight through a masked run. A match whose span overlaps one of the
    // excluded ranges is skipped below rather than reported; `includeCode`
    // drops the code-span half.
    const excluded = nonProseRanges(segment, options.includeCode);
    const tokens: string[] = options.tokens || [];
    for (const token of tokens) {
      try {
        const regex = new RegExp(token, options.ignoreCase ? 'gi' : 'g');
        let match: RegExpExecArray | null;
        while ((match = regex.exec(content)) !== null) {
          // A zero-width match (e.g. a `tokens` pattern like `a*`) never
          // advances lastIndex on its own -- bump it or the loop hangs. It's
          // also semantically meaningless for pattern (there's no real text
          // to report), so skip recording it too -- otherwise a token that
          // can match empty string would report a phantom problem at every
          // character offset it passed through.
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
