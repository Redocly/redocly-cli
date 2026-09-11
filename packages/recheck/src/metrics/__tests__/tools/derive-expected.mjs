// Standalone oracle script that derives the expected values in
// ../fixtures/expected.json — an INDEPENDENT re-implementation of the
// documented statistics/formula spec (the Task 7 brief; see also
// task-7-report.md), used only to hand-compute fixture expectations.
//
// PROVENANCE. This suite originally attempted to vendor expected
// readability values from Rebilly's Lexi (https://github.com/Rebilly/lexi,
// commit 963486e671c1) — on inspection its repo contains no real numeric
// formula output to vendor (its own tests mock the 'text-readability'
// package out entirely), so per the brief's fallback clause the expected
// values are hand-computed from each formula's published definition and
// this package's documented syllable heuristic instead. Full detail lives
// in ../fixtures/expected.json's "provenance" block. This file is NOT part
// of src/metrics and is never imported by it (or by any test): it exists so
// the "expected" numbers come from a second, separately-typed
// implementation of the same documented spec rather than from the code
// under test itself, and so the derivation stays reproducible.
//
// HOW TO RUN (from packages/recheck):
//   node src/metrics/__tests__/tools/derive-expected.mjs
// It reads the fixture texts from ../fixtures/*.txt and prints each
// fixture's stats and six scores; the printed values must match the
// corresponding entries in ../fixtures/expected.json exactly (the test
// suite asserts stats exactly and scores within ±0.1).
//
// SCOPE NOTE. The sentence splitter below is a SIMPLIFIED independent
// implementation — valid ONLY for fixtures with no abbreviations, decimals,
// ordinal enumerators, or code spans (verified by inspection for both
// current fixtures). If a future fixture needs any of that, extend this
// script deliberately; do not silently reuse src/scopes/sentences.ts, which
// would defeat the independent-oracle purpose.

import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));

function tokenizeWords(prose) {
  return prose.split(/\s+/).filter((token) => /[A-Za-z0-9]/.test(token));
}

// The documented syllable heuristic (see ../../statistics.ts): count
// [aeiouy]+ vowel groups of the lowercased, punctuation-stripped word
// (hyphens/apostrophes kept as syllable boundaries), subtract one for a
// silent trailing 'e' unless the word ends in 'le', minimum 1.
function countSyllables(word) {
  const clean = word.toLowerCase().replace(/[^a-z'-]/g, '');
  const groups = clean.match(/[aeiouy]+/g) ?? [];
  let count = groups.length;
  if (clean.endsWith('e') && !clean.endsWith('le')) count -= 1;
  return Math.max(1, count);
}

// Simplified independent sentence splitter — see SCOPE NOTE above. Splits
// after '.', '!', or '?' when followed by whitespace + an uppercase
// letter/quote/bracket, or at end of string.
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

// Each formula from its published definition (citations in
// ../../formulas.ts against each case).
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
  // oxlint-disable-next-line eslint/no-console -- standalone oracle script; console output is its entire purpose (see file header).
  console.log(JSON.stringify({ id: file.replace(/\.txt$/, ''), file, stats, scores }, null, 2));
}
