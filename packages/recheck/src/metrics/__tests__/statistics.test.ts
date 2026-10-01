import { describe, expect, it } from 'vitest';

import { computeTextStatistics } from '../statistics.js';

describe('computeTextStatistics', () => {
  // 11 words, 2 sentences, 40 letters and digits.
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

  it('treats a string with no terminal punctuation as a single sentence', () => {
    expect(computeTextStatistics('no terminator here').sentences).toBe(1);
  });

  // "create" is really 2 syllables ("cre-ate"), but the heuristic reads "ea" as one vowel group and
  // drops the silent final 'e'. That is a known limit of the heuristic.
  it.each([
    ['cat', 1, 'a single vowel group, no trailing e'],
    ['table', 2, 'a trailing "le" is not subtracted'],
    ['readability', 5, '5 vowel groups, no trailing e'],
    ['create', 1, 'the documented heuristic limit'],
  ])('counts "%s" as %i syllable(s): %s', (word, syllables) => {
    expect(computeTextStatistics(word).syllables).toBe(syllables);
  });

  it('counts complexWords as words with 3+ syllables, without excluding proper nouns or inflected suffixes', () => {
    // "readability" (5 syllables) and "complicated" (4) are complex; "the" and "cat" are not.
    const stats = computeTextStatistics('The cat likes readability and complicated words.');
    expect(stats.complexWords).toBe(2);
  });
});
