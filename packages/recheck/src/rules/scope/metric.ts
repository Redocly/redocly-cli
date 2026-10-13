import { extractProse } from '../../core/prose-extract.js';
import {
  computeTextStatistics,
  computeReadability,
  type TextStatistics,
} from '../../metrics/index.js';
import type { NormalizedRule, Problem, MetricAssertion, SizeFormula } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

const FALLBACK_MESSAGE = 'Readability (%s) is %s; expected between %s and %s.';
const SIZE_FALLBACK_MESSAGE = 'Document %s is %s; expected between %s and %s.';

const DEFAULT_WORDS_PER_MINUTE = 200;

// Reading time is rounded to one decimal before the bounds check, so the number in the
// message is the number that was compared.
const SIZE_FORMULAS: Record<
  SizeFormula,
  (stats: TextStatistics, options: MetricAssertion) => number
> = {
  'word-count': (stats) => stats.words,
  'sentence-count': (stats) => stats.sentences,
  'reading-time': (stats, options) =>
    Math.round((stats.words / (options.wordsPerMinute ?? DEFAULT_WORDS_PER_MINUTE)) * 10) / 10,
};

function isSizeFormula(formula: MetricAssertion['formula']): formula is SizeFormula {
  return formula in SIZE_FORMULAS;
}

const execute = async (
  rule: NormalizedRule,
  file: string,
  ctx: ScopeRuleContext
): Promise<Problem[]> => {
  const options = rule.assertions['metric'] as MetricAssertion;
  // `metric` rules always use the `summary` scope (config validation sets it).
  //
  // Statistics are computed per block and added up, so the end of a block always
  // ends a sentence. Joining the blocks and splitting again failed when the next
  // block started with a lowercase word or number.
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

  // computeReadability returns 0 when there is no text. That is not a real score,
  // so a file without prose must not be flagged as too low.
  if (stats.words === 0 || stats.sentences === 0) return [];

  const { formula } = options;
  const score = isSizeFormula(formula)
    ? SIZE_FORMULAS[formula](stats, options)
    : computeReadability(formula, stats);
  const tooLow = options.min !== undefined && score < options.min;
  const tooHigh = options.max !== undefined && score > options.max;
  if (!tooLow && !tooHigh) return [];

  // A readability score belongs to the whole file, so report one problem at 1:1.
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
        rule.message ?? (isSizeFormula(formula) ? SIZE_FALLBACK_MESSAGE : FALLBACK_MESSAGE),
        formula,
        String(score),
        options.min !== undefined ? String(options.min) : '-∞',
        options.max !== undefined ? String(options.max) : '∞'
      ),
    },
  ];
};

export const metric: ScopeRule = { id: 'metric', fixable: false, execute };
