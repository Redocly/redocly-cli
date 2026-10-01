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

  it('counts "cat" as 1 syllable (single vowel group, no trailing e)', () => {
    expect(computeTextStatistics('cat').syllables).toBe(1);
  });

  it('counts "table" as 2 syllables (trailing "le" is NOT subtracted)', () => {
    expect(computeTextStatistics('table').syllables).toBe(2);
  });

  it('counts "readability" as 5 syllables (5 vowel groups, no trailing e)', () => {
    expect(computeTextStatistics('readability').syllables).toBe(5);
  });

  // The real count is 2 ("cre-ate"), but the heuristic reads "ea" as one vowel group
  // and drops the silent final 'e'. This is a known limit of the heuristic.
  it('counts "create" as 1 syllable per the documented heuristic', () => {
    expect(computeTextStatistics('create').syllables).toBe(1);
  });

  it('counts complexWords as words with 3+ syllables, without excluding proper nouns or inflected suffixes', () => {
    // "readability" (5 syllables) and "complicated" (4) are complex; "the" and "cat" are not.
    const stats = computeTextStatistics('The cat likes readability and complicated words.');
    expect(stats.complexWords).toBe(2);
  });
});
