import { newLineRe } from '../../core/line-endings.js';
import type { Problem, NormalizedRule, OccurrenceAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

// Counts regex matches in each segment (not per line, unlike `pattern`) and
// flags the segment when the count is outside `[min, max]`. It has no autofix.
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
    // Ignore empty matches (e.g. `a*` on text without 'a'); they match at every position.
    const count = [...segment.content.matchAll(regex)].filter((m) => m[0].length > 0).length;
    const tooFew = o.min !== undefined && count < o.min;
    const tooMany = o.max !== undefined && count > o.max;
    if (!tooFew && !tooMany) continue;

    const bound = tooFew ? o.min : o.max;
    problems.push({
      file,
      line: segment.startLine,
      column: segment.startColumn,
      // Split on newLineRe so CRLF content does not keep a trailing '\r'.
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
