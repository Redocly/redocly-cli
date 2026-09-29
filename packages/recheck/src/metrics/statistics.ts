import { splitSentences } from '../scopes/sentences.js';

/** Counts for a plain prose string, used by the readability formulas. */
export interface TextStatistics {
  words: number;
  sentences: number;
  syllables: number;
  /** Letters and digits only, without punctuation and whitespace. */
  characters: number;
  /** Words with 3 or more syllables, as estimated by `countSyllables`. */
  complexWords: number;
}

// A word is a whitespace-separated token with at least one ASCII letter or digit.
// "well-known" and "don't" each count as one word, a lone "--" does not.
// Everything here is ASCII-only, so scores only make sense for English.
// Also used by the `length` rule, so both count words the same way.
export function tokenizeWords(prose: string): string[] {
  return prose.split(/\s+/).filter((token) => /[A-Za-z0-9]/.test(token));
}

// Counts vowel groups, minus one for a silent trailing 'e' (but not "le", as in
// "table"), and at least 1. Hyphens and apostrophes are kept because they split
// syllables ("co-op" is 2, "coop" is 1).
function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z'-]/g, '');
  const groups = clean.match(/[aeiouy]+/g) ?? [];
  let count = groups.length;
  if (clean.endsWith('e') && !clean.endsWith('le')) count -= 1;
  return Math.max(1, count);
}

/** Counts words, sentences, syllables, characters and complex words in a prose string. */
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
