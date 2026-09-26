import { extractProse, stripNonProse } from '../../core/prose-extract.js';
import { computeTextStatistics, computeReadability } from '../../metrics/index.js';
import type { NormalizedRule, Problem, MetricAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

// Re-exported so existing direct unit tests keep their import path; the
// implementation lives in core/prose-extract.ts, shared with the
// `recheck --readability` action.
export { stripNonProse };

const FALLBACK_MESSAGE = 'Readability (%s) is %s; expected between %s and %s.';

const execute = async (
  rule: NormalizedRule,
  file: string,
  ctx: ScopeRuleContext
): Promise<Problem[]> => {
  const options = rule.assertions['metric'] as MetricAssertion;
  // `metric` rules are always summary-scoped: config normalization
  // (config/validate.ts, normalizeMetricScope) forces `scope: 'summary'`, so
  // `ctx.segments` arrives as the extractor's summary segments and
  // core/prose-extract.ts turns them into readable prose blocks.
  //
  // Statistics are computed PER BLOCK and summed, so a block's end is an
  // unconditional sentence end. Appending punctuation and re-splitting the
  // joined text was not enough: the shared splitter's boundary rule
  // (terminator + space + capital, abbreviation carve-outs) refused block
  // boundaries whose next word was lowercase or numeric, or whose last word
  // doubled as an abbreviation such as 'max'. Inside a block, the splitter's
  // rule still governs -- that part is genuine prose.
  const blocks = extractProse(ctx.segments);
  const stats = blocks.map(computeTextStatistics).reduce(
    (sum, one) => ({
      words: sum.words + one.words,
      sentences: sum.sentences + one.sentences,
      syllables: sum.syllables + one.syllables,
      characters: sum.characters + one.characters,
      complexWords: sum.complexWords + one.complexWords,
    }),
    { words: 0, sentences: 0, syllables: 0, characters: 0, complexWords: 0 }
  );

  // computeReadability returns 0 for zero words/sentences as a "not enough
  // text to score" placeholder (see metrics/formulas.ts), not a genuine
  // score -- a file with no prose must never be flagged as "too low", so
  // skip the bounds check entirely.
  if (stats.words === 0 || stats.sentences === 0) return [];

  const score = computeReadability(options.formula, stats);
  const tooLow = options.min !== undefined && score < options.min;
  const tooHigh = options.max !== undefined && score > options.max;
  if (!tooLow && !tooHigh) return [];

  // Detection-only, whole-document: always exactly one problem, always at
  // line 1 column 1 -- there is no single source position a readability
  // score "belongs" to.
  return [
    {
      file,
      line: 1,
      column: 1,
      text: '',
      match: '',
      ruleName: rule.name,
      severity: rule.severity,
      message: formatTemplate(
        rule.message ?? FALLBACK_MESSAGE,
        options.formula,
        String(score),
        options.min !== undefined ? String(options.min) : '-∞',
        options.max !== undefined ? String(options.max) : '∞'
      ),
    },
  ];
};

export const metric: ScopeRule = { id: 'metric', fixable: false, execute };
