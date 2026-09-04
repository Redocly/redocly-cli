import { newLineRe } from '../../core/line-endings.js';
import type { Problem, NormalizedRule, OccurrenceAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

// Vale-parity `occurrence` check: counts regex matches within each segment
// (not per-line, unlike `pattern`) and flags the whole segment when the
// count falls outside `[min, max]`. Detection-only — the violation is the
// segment's total count, so there's no single match position to anchor a fix.
const execute = async (
  rule: NormalizedRule,
  file: string,
  ctx: ScopeRuleContext
): Promise<Problem[]> => {
  const problems: Problem[] = [];
  const o = rule.assertions['occurrence'] as OccurrenceAssertion;

  let regex: RegExp;
  try {
    regex = new RegExp(o.pattern, o.ignoreCase ? 'gi' : 'g');
  } catch {
    return problems; // ignore invalid regex
  }

  for (const segment of ctx.segments) {
    // Exclude zero-width matches (e.g. a pattern like `a*` over text with
    // no 'a'): matchAll's iterator advances past each one automatically
    // (unlike a raw exec() loop, there's no hang to guard against), but an
    // empty-text match is still a match at every position in the segment
    // -- counting it would inflate the total so `max` bounds always
    // violate and `min` is trivially satisfied.
    const count = [...segment.content.matchAll(regex)].filter((m) => m[0].length > 0).length;
    const tooFew = o.min !== undefined && count < o.min;
    const tooMany = o.max !== undefined && count > o.max;
    if (!tooFew && !tooMany) continue;

    const bound = tooFew ? o.min : o.max;
    problems.push({
      file,
      line: segment.startLine,
      column: segment.startColumn,
      // newLineRe, not '\n': a bare split leaves a trailing '\r' on CRLF content.
      text: segment.content.split(newLineRe)[0] ?? '',
      match: o.pattern,
      ruleName: rule.name,
      severity: rule.severity,
      message: formatTemplate(
        rule.message ??
          (tooFew
            ? 'Found %s matches; expected at least %s.'
            : 'Found %s matches; expected at most %s.'),
        String(count),
        String(bound)
      ),
    });
  }

  return problems;
};

export const occurrence: ScopeRule = { id: 'occurrence', fixable: false, execute };
