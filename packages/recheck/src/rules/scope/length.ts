import { newLineRe } from '../../core/line-endings.js';
import { tokenizeWords } from '../../metrics/statistics.js';
import { splitSentences } from '../../scopes/sentences.js';
import type { ScopedSegment } from '../../scopes/types.js';
import type { Problem, NormalizedRule, LengthAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

const FALLBACK_MAX = 'Segment is %s %s; at most %s allowed';
const FALLBACK_MIN = 'Segment is %s %s; at least %s required';

// Single measurement helper, used by nothing else: `sentences` delegates to
// the shared sentence-boundary definition (scopes/sentences.ts), and `words`
// delegates to the metrics module's own tokenizer (see its export-site
// comment for why sharing that implementation with `metric` matters).
//
// `characters` takes the whole segment, not just its content, because a masked
// markdoc tag's span is blanked to same-width spaces rather than removed.
// `tokenizeWords` and `splitSentences` already read through that mask
// correctly, treating a run of blanks as a gap like real whitespace, but a raw
// `content.length` would count those invisible characters as visible prose:
// `# Head text {% #averylonganchorname %}` measured 36 characters for the 10 a
// reader actually sees. Subtracting each masked span's width corrects the
// count. A segment that was never masked has no `maskedRanges`, so this is
// exactly `content.length`.
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
  // A leading bold label ("**Label:** Description.") is structure, not part
  // of the measured text, so it stays out of the word count. The colon may
  // sit inside or outside the closing markers.
  const prose = content.replace(/^\s*(?:\*\*|__)[^*_\n]+?(?::(?:\*\*|__)|(?:\*\*|__):)\s+/, '');
  return tokenizeWords(prose).length;
}

// Recheck-original `length` check: measures each scoped segment's size and
// flags it when the measurement falls outside `[min, max]`. Detection-only
// -- like `occurrence`, a size violation has no single position to anchor
// an edit to (shrinking or growing a segment to fit is an editorial
// decision, not a mechanical rewrite). Unlike `metric`, this honors
// whichever `scope` the rule configures -- e.g. `scope: alt` to cap image
// alt text length, `scope: sentence` to cap sentence length in words.
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

    // Picking `tooSmall`'s branch first is only exhaustive because
    // validate() rejects `min > max`, so a segment can never be both
    // tooSmall and tooLarge at once -- a hand-built rule that skips
    // validate() must preserve that invariant itself or this silently
    // reports the wrong bound.
    const bound = tooSmall ? o.min : o.max;
    problems.push({
      file,
      line: segment.startLine,
      column: segment.startColumn,
      // newLineRe, not '\n': a bare split leaves a trailing '\r' on CRLF
      // content (see occurrence.ts).
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
