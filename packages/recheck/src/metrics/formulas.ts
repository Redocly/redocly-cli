import type { TextStatistics } from './statistics.js';

/** The six supported readability formulas, all computed from a `TextStatistics`. */
export type ReadabilityFormula =
  | 'flesch-reading-ease'
  | 'flesch-kincaid-grade'
  | 'gunning-fog'
  | 'smog'
  | 'coleman-liau'
  | 'automated-readability';

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Computes a readability score from pre-computed `TextStatistics` using the
 * standard published definition for `formula` (cited per-case below),
 * rounded to 2 decimals.
 *
 * Contract: every one of these formulas divides by `words` and/or
 * `sentences`, so a stats object with 0 words or 0 sentences (e.g. an empty
 * or non-prose input) would otherwise produce NaN/Infinity. Rather than
 * propagate that, `computeReadability` returns `0` for every formula in
 * that case -- callers (e.g. the `metric` assertion) should treat that 0 as
 * "not enough text to score", not as a genuine "perfectly readable" result.
 */
export function computeReadability(formula: ReadabilityFormula, stats: TextStatistics): number {
  const { words, sentences, syllables, characters, complexWords } = stats;
  if (words === 0 || sentences === 0) return 0;

  const wordsPerSentence = words / sentences;

  switch (formula) {
    case 'flesch-reading-ease': {
      // Flesch, R. (1948). "A New Readability Yardstick." Journal of
      // Applied Psychology, 32(3), 221-233.
      const syllablesPerWord = syllables / words;
      return round2(206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord);
    }
    case 'flesch-kincaid-grade': {
      // Kincaid, J.P., Fishburne, R.P., Rogers, R.L., & Chissom, B.S.
      // (1975). "Derivation of New Readability Formulas for Navy Enlisted
      // Personnel." Research Branch Report 8-75, Naval Air Station Memphis.
      const syllablesPerWord = syllables / words;
      return round2(0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59);
    }
    case 'gunning-fog': {
      // Gunning, R. (1952). The Technique of Clear Writing. McGraw-Hill.
      const percentComplex = 100 * (complexWords / words);
      return round2(0.4 * (wordsPerSentence + percentComplex));
    }
    case 'smog': {
      // McLaughlin, G.H. (1969). "SMOG Grading -- a New Readability
      // Formula." Journal of Reading, 12(8), 639-646. Canonically requires
      // sampling 30 sentences (10 each from the start/middle/end of a
      // document) for validity; like most software implementations (e.g.
      // the widely-used `textstat`/`text-readability` ports), this applies
      // the same formula directly to whatever sentence count is available
      // rather than refusing to score shorter text.
      return round2(1.043 * Math.sqrt(complexWords * (30 / sentences)) + 3.1291);
    }
    case 'coleman-liau': {
      // Coleman, M., & Liau, T.L. (1975). "A computer readability formula
      // designed for machine scoring." Journal of Applied Psychology,
      // 60(2), 283-284.
      const lettersPer100Words = (characters / words) * 100;
      const sentencesPer100Words = (sentences / words) * 100;
      return round2(0.0588 * lettersPer100Words - 0.296 * sentencesPer100Words - 15.8);
    }
    case 'automated-readability': {
      // Senter, R.J., & Smith, E.A. (1967). "Automated Readability Index."
      // AMRL-TR-6620, Aerospace Medical Research Laboratories.
      const charactersPerWord = characters / words;
      return round2(4.71 * charactersPerWord + 0.5 * wordsPerSentence - 21.43);
    }
    default: {
      const exhaustive: never = formula;
      throw new Error(`Unknown readability formula: ${String(exhaustive)}`);
    }
  }
}
