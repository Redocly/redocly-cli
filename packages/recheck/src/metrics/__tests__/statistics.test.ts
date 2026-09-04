import { describe, expect, it } from 'vitest';

import { computeTextStatistics } from '../statistics.js';

describe('computeTextStatistics', () => {
  // Hand-countable fixture. Verified independently (see task-7-report.md):
  // words via a whitespace split ('The','quick','fox','runs','fast.','It',
  // 'jumps','over','2','logs','today!' -- 11 tokens, each containing a
  // letter or digit); sentences via src/scopes/sentences.ts's own splitter
  // (2 spans: "...fast." / "It...today!"); characters (letters+digits only)
  // counted with an independent regex pass (40).
  const fixture = 'The quick fox runs fast. It jumps over 2 logs today!';

  it('counts words as whitespace-delimited tokens containing a letter or digit', () => {
    expect(computeTextStatistics(fixture).words).toBe(11);
  });

  it('counts sentences via the shared splitSentences splitter', () => {
    expect(computeTextStatistics(fixture).sentences).toBe(2);
  });

  it('counts characters as letters and digits only (no punctuation/whitespace)', () => {
    expect(computeTextStatistics(fixture).characters).toBe(40);
  });

  it('returns all-zero statistics for an empty string', () => {
    expect(computeTextStatistics('')).toEqual({
      words: 0,
      sentences: 0,
      syllables: 0,
      characters: 0,
      complexWords: 0,
    });
  });

  // A prose string with no terminal punctuation at all is still one
  // sentence (src/scopes/sentences.ts's own contract -- see its "treats a
  // no-terminator string as one sentence" test), not zero.
  it('treats a string with no terminal punctuation as a single sentence', () => {
    expect(computeTextStatistics('no terminator here').sentences).toBe(1);
  });

  // --- syllable heuristic spot-checks -------------------------------------
  // Heuristic (documented in statistics.ts): lowercase; count vowel groups
  // matching /[aeiouy]+/; subtract one for a silent trailing 'e' UNLESS the
  // word ends in 'le'; minimum of 1. Each of these single-word inputs is its
  // own one-word, one-sentence "prose string", so `.syllables` directly
  // reports countSyllables()'s result for that word.
  it('counts "cat" as 1 syllable (single vowel group, no trailing e)', () => {
    expect(computeTextStatistics('cat').syllables).toBe(1);
  });

  it('counts "table" as 2 syllables (trailing "le" is NOT subtracted)', () => {
    expect(computeTextStatistics('table').syllables).toBe(2);
  });

  it('counts "readability" as 5 syllables (5 vowel groups, no trailing e)', () => {
    expect(computeTextStatistics('readability').syllables).toBe(5);
  });

  // DISAGREEMENT WITH THE BRIEF'S LISTED SPOT-CHECK, reported rather than
  // silently fudged (per task-7-brief.md's own instruction): the brief lists
  // create=2, but the documented heuristic actually yields 1 for this word,
  // verified by hand before writing this expectation:
  //   "create" -> lowercase "create" -> vowel groups /[aeiouy]+/ on
  //   c-r-e-a-t-e finds "ea" (positions 2-3, one group -- the heuristic
  //   treats adjacent vowel LETTERS as one group regardless of whether
  //   they're pronounced as one syllable or two) and "e" (position 5) -> 2
  //   raw groups. The word ends in "e" and does NOT end in "le", so the
  //   silent-trailing-e rule subtracts 1 -> 2 - 1 = 1, clamped to a minimum
  //   of 1 -> stays 1.
  // The true phonetic count is 2 ("cre-ate"): this is a real limitation of a
  // vowel-group heuristic on words with vowel hiatus (adjacent vowel
  // letters read as separate syllables, not a diphthong), not a bug in this
  // implementation -- see also "geometry"/"infinitely" in the fixture
  // suite's oracle notes for the same effect. See task-7-report.md's
  // "concerns" section for this exact disagreement.
  it('counts "create" as 1 syllable per the documented heuristic (see comment: brief listed 2, heuristic disagrees)', () => {
    expect(computeTextStatistics('create').syllables).toBe(1);
  });

  // --- complexWords --------------------------------------------------------
  // complexWords counts words with 3+ syllables per the SAME heuristic above.
  // Per the brief's own interface comment: excluding proper nouns and common
  // suffix inflations ("common suffx inflations", verbatim from the brief)
  // is NOT attempted -- this is a syllable-count-only approximation of the
  // traditional Gunning Fog/SMOG "complex word" definition.
  it('counts complexWords as words with 3+ syllables, without excluding proper nouns or inflected suffixes', () => {
    // "readability" (5 syllables) and "complicated" (com-pli-ca-ted -- 4
    // vowel groups: 'o','i','a','e', no trailing-e subtraction since it
    // ends in 'd') are both complex; "the" and "cat" are not.
    const stats = computeTextStatistics('The cat likes readability and complicated words.');
    expect(stats.complexWords).toBe(2);
  });
});
