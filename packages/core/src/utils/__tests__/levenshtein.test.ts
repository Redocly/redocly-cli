import { levenshteinDistance, levenshteinSimilarity } from '../levenshtein.js';

describe('levenshteinDistance', () => {
  it.each([
    ['latte', 'latte', 0],
    ['latte', 'lattes', 1],
    ['kitten', 'sitting', 3],
    ['', 'mocha', 5],
    ['', '', 0],
  ])('turns "%s" into "%s" in %i edits', (left, right, distance) => {
    expect(levenshteinDistance(left, right)).toBe(distance);
  });
});

describe('levenshteinSimilarity', () => {
  it.each([
    ['latte', 'latte', 1],
    ['tea', 'cup', 0],
    ['limit', 'limits', 5 / 6],
    ['', '', 1],
  ])('rates "%s" and "%s" as %d alike', (left, right, similarity) => {
    expect(levenshteinSimilarity(left, right)).toBe(similarity);
  });
});
