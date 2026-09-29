// Standalone script that computes the expected values in ../fixtures/expected.json.
// It re-implements the statistics and formulas separately from src/metrics, so the
// expected numbers do not come from the code under test. Nothing imports it.
//
// Run from packages/recheck: node src/metrics/__tests__/tools/derive-expected.mjs
// The printed values must match expected.json.
//
// The sentence splitter is simplified: it only works for text without abbreviations,
// decimals, numbered lists or code spans, which holds for the current fixtures.

import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));

function tokenizeWords(prose) {
  return prose.split(/\s+/).filter((token) => /[A-Za-z0-9]/.test(token));
}

// Same syllable heuristic as statistics.ts.
function countSyllables(word) {
  const clean = word.toLowerCase().replace(/[^a-z'-]/g, '');
  const groups = clean.match(/[aeiouy]+/g) ?? [];
  let count = groups.length;
  if (clean.endsWith('e') && !clean.endsWith('le')) count -= 1;
  return Math.max(1, count);
}

// Splits after '.', '!' or '?' when followed by whitespace and an uppercase
// letter, quote or bracket, or at the end of the text.
function splitSentencesNaive(text) {
  const spans = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!'.!?'.includes(ch)) continue;
    while (i + 1 < text.length && '.!?'.includes(text[i + 1])) i++;
    const next = text[i + 1];
    if (next === undefined) break;
    if (!/\s/.test(next)) continue;
    const after = text[i + 2];
    if (after === undefined || !/[A-Z"'([]/.test(after)) continue;
    const raw = text.slice(start, i + 1).trim();
    if (raw) spans.push(raw);
    start = i + 1;
  }
  const tail = text.slice(start).trim();
  if (tail) spans.push(tail);
  return spans;
}

function computeTextStatistics(prose) {
  const words = tokenizeWords(prose);
  const sentences = splitSentencesNaive(prose).length;
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

function round2(v) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

function computeScores(stats) {
  const { words, sentences, syllables, characters, complexWords } = stats;
  const fre = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  const fkgl = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  const fog = 0.4 * (words / sentences + 100 * (complexWords / words));
  const smog = 1.043 * Math.sqrt(complexWords * (30 / sentences)) + 3.1291;
  const L = (characters / words) * 100;
  const S = (sentences / words) * 100;
  const cli = 0.0588 * L - 0.296 * S - 15.8;
  const ari = 4.71 * (characters / words) + 0.5 * (words / sentences) - 21.43;
  return {
    'flesch-reading-ease': round2(fre),
    'flesch-kincaid-grade': round2(fkgl),
    'gunning-fog': round2(fog),
    smog: round2(smog),
    'coleman-liau': round2(cli),
    'automated-readability': round2(ari),
  };
}

const fixtureFiles = ['wikipedia-non-euclidean.txt', 'committee-proposals.txt'];

for (const file of fixtureFiles) {
  const text = readFileSync(path.join(dir, '../fixtures', file), 'utf8');
  const stats = computeTextStatistics(text);
  const scores = computeScores(stats);
  // oxlint-disable-next-line eslint/no-console -- standalone script that prints its results
  console.log(JSON.stringify({ id: file.replace(/\.txt$/, ''), file, stats, scores }, null, 2));
}
