import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { computeReadability, type ReadabilityFormula } from '../formulas.js';
import { computeTextStatistics, type TextStatistics } from '../statistics.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

// A fixed, arbitrarily-chosen stats object -- NOT derived from any real
// prose -- so each formula can be checked against its own published
// definition by plain arithmetic, independent of computeTextStatistics.
const fixedStats: TextStatistics = {
  words: 100,
  sentences: 5,
  syllables: 150,
  characters: 480,
  complexWords: 12,
};

describe('computeReadability -- each formula against its published definition', () => {
  // Expected values below are hand-computed directly from each formula's
  // canonical definition (cited inline) applied to `fixedStats`, rounded to
  // 2 decimals -- e.g. flesch-reading-ease:
  //   206.835 - 1.015*(100/5) - 84.6*(150/100)
  //   = 206.835 - 20.3 - 126.9 = 59.635 -> 59.64
  // See formulas.ts for the same citations against each `case`.

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

  // Documented division-by-zero contract: 0 words or 0 sentences returns 0
  // for every formula rather than NaN/Infinity (every formula divides by
  // one or both).
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

// --- Readability fixture suite (hand-derived) --------------------------------
//
// Rebilly's Lexi (https://github.com/Rebilly/lexi) is NOT on npm -- the
// unrelated npm package literally named "lexi" must not be depended on.
// This suite was meant to vendor Lexi's own test-derived expected readability
// values as a real oracle. On inspection (see fixtures/expected.json's
// "provenance" block, and task-7-report.md), Lexi's repo does NOT contain
// any hand-verifiable real formula output: its src/readability.ts delegates
// every score to the separate 'text-readability' npm package, and Lexi's own
// unit tests mock that package out entirely (fixed stub values), while its
// one unmocked integration test only compares two inputs to each other, never
// to an absolute expected number. There is nothing genuine to vendor as a
// "Lexi-derived" numeric expected value for any of our six formulas.
//
// Per the brief's own fallback clause, expected stats/scores in
// fixtures/expected.json are therefore HAND-COMPUTED from the published
// formula definitions and this task's documented syllable heuristic, via a
// standalone oracle script independent of src/metrics (committed at
// tools/derive-expected.mjs next to this suite; see also task-7-report.md)
// -- NOT fabricated as if sourced from Lexi. One of the two fixture texts
// (wikipedia-non-euclidean.txt) is still genuinely vendored FROM Lexi's own
// repo (its test-data/new/test-document.md, used there as CLI demo prose)
// for a real-world prose sample, with full attribution in expected.json.
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
