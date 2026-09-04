import { splitSentences } from '../scopes/sentences.js';

/**
 * Plain-prose text statistics feeding the readability formulas in
 * `formulas.ts`. This module is pure -- no rules/, core/runner, or config/
 * imports, and no markdown parsing: callers (e.g. the `metric` assertion)
 * extract a plain prose string out of markdown first.
 */
export interface TextStatistics {
  words: number;
  sentences: number;
  syllables: number;
  /** Letters + digits only -- excludes punctuation and whitespace. Used by the automated-readability and coleman-liau formulas. */
  characters: number;
  /**
   * Words with 3+ syllables per the `countSyllables` heuristic below (no
   * proper-noun or suffix carve-outs).
   */
  complexWords: number;
}

// A "word" is a maximal whitespace-delimited token containing at least one
// ASCII letter or digit: punctuation-only tokens (a lone "--" or "...")
// don't count, while hyphenated compounds ("well-known") and contractions
// ("don't") count as ONE word each. Tokenization is ASCII-only throughout
// this module (here, the syllable heuristic, and the `characters` count),
// so scores are meaningful for English prose.
//
// Exported deliberately -- there are exactly two consumers, and they must
// share one implementation: `computeTextStatistics` below (readability
// formulas) and the `length` scope assertion's `unit: 'words'` measurement
// (rules/scope/length.ts). If `length` grew its own word-counting regex,
// its word counts could silently drift from `metric`'s (e.g. a Microsoft
// preset rule capping alt text at N words would disagree with a readability
// rule scoring the same text) -- a duplicate here would be a correctness
// bug, not just repeated code, so this is a shared-utility export, not the
// "new rule's only consumer" shape a reviewer should otherwise flag (see
// task-6-resolutions.md item 4).
export function tokenizeWords(prose: string): string[] {
  return prose.split(/\s+/).filter((token) => /[A-Za-z0-9]/.test(token));
}

// Syllable heuristic: count vowel groups (/[aeiouy]+/, lowercase); subtract
// one for a silent trailing 'e' unless the word ends in 'le' ("table");
// minimum of 1. The token is first reduced to lowercase letters, hyphens,
// and apostrophes so attached punctuation ("make,") can't defeat the
// trailing-e check; hyphens/apostrophes are kept because they act as real
// syllable boundaries ("co-op" is 2 vowel groups, "coop" is 1).
function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z'-]/g, '');
  const groups = clean.match(/[aeiouy]+/g) ?? [];
  let count = groups.length;
  if (clean.endsWith('e') && !clean.endsWith('le')) count -= 1;
  return Math.max(1, count);
}

/**
 * Computes word/sentence/syllable/character/complex-word statistics for a
 * plain prose string. `sentences` is delegated to `scopes/sentences.ts`'s
 * `splitSentences` so the whole codebase shares one sentence-boundary
 * definition.
 */
export function computeTextStatistics(prose: string): TextStatistics {
  const words = tokenizeWords(prose);
  const sentences = splitSentences(prose).length;
  const characters = (prose.match(/[A-Za-z0-9]/g) ?? []).length;

  let syllables = 0;
  let complexWords = 0;
  for (const word of words) {
    const count = countSyllables(word);
    syllables += count;
    if (count >= 3) complexWords += 1;
  }

  return { words: words.length, sentences, syllables, characters, complexWords };
}
