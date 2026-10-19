import { newLineRe } from '../../core/line-endings.js';
import { tokenizeWords } from '../../metrics/statistics.js';
import { splitSentences } from '../../scopes/sentences.js';
import type { ScopedSegment } from '../../scopes/types.js';
import type { Problem, NormalizedRule, LengthAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

const FALLBACK_MAX = 'Segment is %s %s; at most %s allowed';
const FALLBACK_MIN = 'Segment is %s %s; at least %s required';

// Masked markdoc tags are blanked to spaces of the same width, so
// `content.length` would count them as visible text. Subtract their width.
function measure(segment: ScopedSegment, unit: LengthAssertion['unit']): number {
  const { content } = segment;
  if (unit === 'characters') {
    const maskedWidth = (segment.maskedRanges ?? []).reduce(
      (total, range) => total + (range.end - range.start),
      0
    );
    return content.length - maskedWidth;
  }
  if (unit === 'sentences') return splitSentences(content).length;
  // Skip a leading bold label ("**Label:** Description."); the colon may be inside or outside
  // the bold.
  const prose = content.replace(/^\s*(?:\*\*|__)[^*_\n]+?(?::(?:\*\*|__)|(?:\*\*|__):)\s+/, '');
  return tokenizeWords(prose).length;
}

// Flags each scoped segment whose size is outside `[min, max]`. Unlike `metric`,
// it uses the rule's own `scope`, e.g. `alt` or `sentence`. It has no autofix.
const execute = async (
  rule: NormalizedRule,
  file: string,
  ctx: ScopeRuleContext
): Promise<Problem[]> => {
  const problems: Problem[] = [];
  const o = rule.assertions['length'] as LengthAssertion;

  for (const segment of ctx.segments) {
    const size = measure(segment, o.unit);
    const tooSmall = o.min !== undefined && size < o.min;
    const tooLarge = o.max !== undefined && size > o.max;
    if (!tooSmall && !tooLarge) continue;

    // validate() rejects `min > max`, so a segment is never both too small and too large.
    const bound = tooSmall ? o.min : o.max;
    problems.push({
      file,
      line: segment.startLine,
      column: segment.startColumn,
      // Split on newLineRe so CRLF content does not keep a trailing '\r'.
      text: segment.content.split(newLineRe)[0] ?? '',
      match: String(size),
      ruleName: rule.name,
      severity: rule.severity,
      message: formatTemplate(
        rule.message ?? (tooSmall ? FALLBACK_MIN : FALLBACK_MAX),
        String(size),
        o.unit,
        String(bound)
      ),
    });
  }

  return problems;
};

export const length: ScopeRule = { id: 'length', fixable: false, execute };
