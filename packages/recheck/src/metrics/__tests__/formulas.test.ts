import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { computeReadability, type ReadabilityFormula } from '../formulas.js';
import { computeTextStatistics, type TextStatistics } from '../statistics.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

// Made-up statistics, so each formula can be checked by hand without computeTextStatistics.
const fixedStats: TextStatistics = {
  words: 100,
  sentences: 5,
  syllables: 150,
  characters: 480,
  complexWords: 12,
};

describe('computeReadability -- each formula against its published definition', () => {
  // Expected values are worked out by hand from each formula, rounded to 2 decimals.
  // For example flesch-reading-ease: 206.835 - 1.015*(100/5) - 84.6*(150/100) = 59.635, which
  // rounds to 59.64.

  it('flesch-reading-ease: Flesch (1948)', () => {
    // 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
    expect(computeReadability('flesch-reading-ease', fixedStats)).toBe(59.64);
  });

  it('flesch-kincaid-grade: Kincaid et al. (1975)', () => {
    // 0.39*(words/sentences) + 11.8*(syllables/words) - 15.59
    expect(computeReadability('flesch-kincaid-grade', fixedStats)).toBe(9.91);
  });

  it('gunning-fog: Gunning (1952)', () => {
    // 0.4 * ((words/sentences) + 100*(complexWords/words))
    expect(computeReadability('gunning-fog', fixedStats)).toBe(12.8);
  });

  it('smog: McLaughlin (1969)', () => {
    // 1.043 * sqrt(complexWords * (30/sentences)) + 3.1291
    expect(computeReadability('smog', fixedStats)).toBe(11.98);
  });

  it('coleman-liau: Coleman & Liau (1975)', () => {
    // L = (characters/words)*100 ; S = (sentences/words)*100
    // 0.0588*L - 0.296*S - 15.8
    expect(computeReadability('coleman-liau', fixedStats)).toBe(10.94);
  });

  it('automated-readability: Senter & Smith (1967)', () => {
    // 4.71*(characters/words) + 0.5*(words/sentences) - 21.43
    expect(computeReadability('automated-readability', fixedStats)).toBe(11.18);
  });

  // Every formula divides by words or sentences, so zero must give 0, not NaN or Infinity.
  const allFormulas: ReadabilityFormula[] = [
    'flesch-reading-ease',
    'flesch-kincaid-grade',
    'gunning-fog',
    'smog',
    'coleman-liau',
    'automated-readability',
  ];

  it.each(allFormulas)('%s returns 0 when words is 0', (formula) => {
    expect(
      computeReadability(formula, {
        words: 0,
        sentences: 3,
        syllables: 0,
        characters: 0,
        complexWords: 0,
      })
    ).toBe(0);
  });

  it.each(allFormulas)('%s returns 0 when sentences is 0', (formula) => {
    expect(
      computeReadability(formula, {
        words: 10,
        sentences: 0,
        syllables: 15,
        characters: 40,
        complexWords: 1,
      })
    ).toBe(0);
  });
});

// Expected values in fixtures/expected.json are computed by tools/derive-expected.mjs,
// not by the code under test.
interface FixtureExpectation {
  id: string;
  file: string;
  stats: TextStatistics;
  scores: Record<ReadabilityFormula, number>;
}

const expectedFixture = JSON.parse(
  readFileSync(path.join(dir, 'fixtures/expected.json'), 'utf8')
) as { fixtures: FixtureExpectation[] };

const TOLERANCE = 0.1;

describe('readability fixture suite (hand-derived; see provenance)', () => {
  for (const fixture of expectedFixture.fixtures) {
    describe(fixture.id, () => {
      const prose = readFileSync(path.join(dir, 'fixtures', fixture.file), 'utf8');
      const stats = computeTextStatistics(prose);

      it('matches the hand-computed statistics exactly', () => {
        expect(stats).toEqual(fixture.stats);
      });

      for (const formula of Object.keys(fixture.scores) as ReadabilityFormula[]) {
        it(`matches the hand-computed ${formula} score within +/-${TOLERANCE}`, () => {
          const actual = computeReadability(formula, stats);
          const expected = fixture.scores[formula];
          expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOLERANCE);
        });
      }
    });
  }
});
