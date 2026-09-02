// Pure AP/Chicago title-case algorithms backing the Vale-parity
// `capitalization` assertion's `$title` match (see ./capitalization.ts).
// Deliberately no markdown/Vale awareness here -- these functions operate
// on plain text only. Scope/segment handling, backtick-span freezing, and
// the problem/fix wiring all live in capitalization.ts. The one import below
// is the mask CHARACTER, not any markdown handling: masking happens in
// capitalization.ts, and the tokenizer here only has to recognize the result.
//
// Shared casing rules (both styles):
// - The FIRST and LAST word are ALWAYS capitalized, regardless of any
//   stopword list below.
// - A word listed in `exceptions` (matched case-insensitively) is
//   rewritten to its EXACT as-written form from that list, everywhere in
//   the title -- including first/last position -- overriding every rule
//   below (e.g. 'GitHub', 'iPhone').
// - A word already in ALL-CAPS (2+ letters, e.g. an acronym like 'API') is
//   left exactly as written, also overriding the stopword/position rules.
// - A hyphenated compound (e.g. 'editor-in-chief' -> 'Editor-in-Chief')
//   runs each hyphen part through the same rules a standalone word gets --
//   see capitalizeHyphenated.
// - Every other (non-edge, non-hyphenated, non-exception, non-ALL-CAPS)
//   word is either forced lowercase (a stopword for the active style) or
//   capitalized (initial letter upper, rest lower).
//
// Style difference (the stopword list lowercased mid-title):
// - AP: articles, coordinating conjunctions, and prepositions of THREE
//   letters or fewer.
// - Chicago: articles, coordinating conjunctions, and EVERY preposition
//   regardless of length -- via the fixed list below (JS has no built-in
//   dictionary of "all English prepositions" to draw on).
import { INLINE_CODE_MASK_CHAR } from '../../core/inline-code.js';
import { ABBREVIATIONS, lastWordBefore } from '../../scopes/sentences.js';

const ARTICLES = ['a', 'an', 'the'];
const COORDINATING_CONJUNCTIONS = ['and', 'but', 'or', 'nor', 'for', 'so', 'yet'];
// Every entry here is <= 3 letters -- both AP and Chicago lowercase these.
const SHORT_PREPOSITIONS = ['at', 'by', 'in', 'of', 'off', 'on', 'out', 'to', 'up', 'via'];
// Chicago-only: prepositions of 4+ letters. AP capitalizes these mid-title
// (they're not in AP_STOPWORDS); Chicago lowercases them like any other
// preposition.
const LONG_PREPOSITIONS = [
  'about',
  'above',
  'across',
  'after',
  'against',
  'along',
  'among',
  'around',
  'before',
  'behind',
  'below',
  'between',
  'during',
  'through',
  'toward',
  'under',
  'until',
  'with',
  'within',
  'without',
];

const AP_STOPWORDS = new Set([...ARTICLES, ...COORDINATING_CONJUNCTIONS, ...SHORT_PREPOSITIONS]);
const CHICAGO_STOPWORDS = new Set([
  ...ARTICLES,
  ...COORDINATING_CONJUNCTIONS,
  ...SHORT_PREPOSITIONS,
  ...LONG_PREPOSITIONS,
]);

// One "word" is a run of letters/digits, optionally joined by internal
// hyphens ('well-known') or apostrophes ("don't"); anything else is a
// separator copied through verbatim. Phrase exceptions never reach the
// tokenizer -- tokenizeCasingWords carves them out first.

/**
 * True for a word that's already an ALL-CAPS acronym (2+ letters, e.g.
 * 'API', 'HTML5') -- both styles leave these exactly as written rather
 * than lowercasing or capitalizing them. Non-letter characters (digits)
 * don't count toward the length or case check.
 */
export function isAllCapsWord(word: string): boolean {
  const letters = word.replace(/[^A-Za-z]/g, '');
  return letters.length >= 2 && letters === letters.toUpperCase();
}

/** The `v2` of `v2.0`, or `v3`. The `v` must be the whole alphabetic part,
 *  so an ordinary word like `vector3` is untouched. */
export function isVersionToken(word: string): boolean {
  return /^v\d+$/i.test(word);
}

/** `x-metadata`, `x-codeSamples`. Case-sensitive: matching `X-` too would
 *  freeze `X-ray` and AWS `X-Ray`. */
export function isVendorExtensionToken(word: string): boolean {
  return /^x-./.test(word);
}

/** Tokens whose own casing is already correct. Must be checked before
 *  hyphen splitting -- an extension's `-` is part of its name. */
export function keepsOwnCasing(word: string): boolean {
  return isAllCapsWord(word) || isVersionToken(word) || isVendorExtensionToken(word);
}

function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// -- Shared exception decision (single-word AND phrase entries) ----------
//
// This is the ONE place `exceptions` is turned into a lookup, used by
// apTitleCase/chicagoTitleCase below AND by capitalization.ts's
// sentenceCase. Before this task, exception lookup was implemented twice
// -- title-case.ts's own (now-removed) buildExceptionMap, and a second,
// independent inline map inside capitalization.ts's sentenceCase -- which
// meant a fix to one path could silently leave the other out of step
// (exactly what happened here: an entry like 'Node.js' or 'VS Code' is
// dead config under a per-word tokenizer, since WORD_RE splits on whitespace
// and '.', but nothing enforced that the two paths agreed on treating it that
// way, or on how to fix it). apTitleCase is exported and called directly (not
// only reached through capitalization.ts), so this plan has to live where
// apTitleCase itself can use it -- here -- rather than only in
// capitalization.ts's pipeline. The tokenization that consumes the plan is
// shared for the same reason (recaseWords, below): $sentence used to declare
// its own copy of WORD_RE and drive its own token loop.
export interface ExceptionPlan {
  // Single-token entries (no whitespace or dot) -- looked up per word or
  // per hyphen-part, exactly as before this task.
  wordMap: Map<string, string>;
  // Multi-token entries (contain whitespace and/or a dot), longest-first so
  // e.g. 'Visual Studio Code' claims its span before 'VS Code' can also
  // match inside it (see findPhraseMatches's overlap rule below).
  phrases: string[];
}

export function buildExceptionPlan(exceptions: string[]): ExceptionPlan {
  const phrases = exceptions.filter((e) => /[\s.]/.test(e)).sort((a, b) => b.length - a.length);
  const phraseSet = new Set(phrases);
  const wordMap = new Map<string, string>();
  for (const exception of exceptions) {
    if (phraseSet.has(exception)) continue; // phrases are matched separately, below
    wordMap.set(exception.toLowerCase(), exception);
  }
  return { wordMap, phrases };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface PhraseMatch {
  start: number;
  end: number; // exclusive
  exception: string; // the as-written phrase to restore, NOT the matched text
}

// Finds every non-overlapping occurrence of a phrase exception in `text`,
// case-insensitively but otherwise LITERALLY -- no whitespace normalization,
// no word-boundary requirement, and no regex sourced from config (every
// candidate is a fixed exception string, run through escapeRegExp). Literal
// matching is what guarantees a match is always exactly `phrase.length`
// characters long, which is in turn what lets a matched span be replaced by
// the as-written exception without shifting any later offset (see
// CasingToken.exception).
// `phrases` is already longest-first (buildExceptionPlan), so a match
// recorded for an earlier (longer) phrase claims its range and a later
// (shorter) phrase cannot also match any part of it.
function findPhraseMatches(text: string, phrases: string[]): PhraseMatch[] {
  const matches: PhraseMatch[] = [];
  for (const phrase of phrases) {
    const pattern = new RegExp(escapeRegExp(phrase), 'gi');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (!matches.some((claimed) => start < claimed.end && claimed.start < end)) {
        matches.push({ start, end, exception: phrase });
      }
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

// -- Tokenization: a phrase exception is an atomic TOKEN, not a masked span --
//
// This is where https://github.com/Redocly/redocly/issues/25610 was fixed; the
// masking this replaced used to carry a TODO pointing at that issue, and
// README.md's `$sentence` section used to document it as a known bug.
//
// Keeping a phrase atomic to per-word casing and giving it a POSITION in the
// word sequence are two different jobs, and #25610 was what happened when one
// mechanism did both. Both `$`-styles derive meaning from position -- `$title`
// always capitalizes the first and last word, `$sentence` capitalizes the
// first -- and the previous implementation achieved atomicity by replacing
// each phrase span with a same-length run of a placeholder character
// (PHRASE_MASK_CHAR, '\x01') before tokenizing. That made the phrase atomic by
// making it INVISIBLE to the tokenizer, so it also stopped counting as a word,
// and the adjacent real word silently inherited its first/last treatment:
//
//   $sentence, exceptions: ['VS Code']
//     'VS Code actions for teams' -> 'VS Code Actions for teams'
//                                     ('actions' became the first word)
//   $title/AP, exceptions: ['Node.js']
//     'a guide to Node.js'        -> 'A Guide To Node.js'
//                                     ('to' became the last word, and AP
//                                      capitalizes the last word always)
//
// Tokenizing the ORIGINAL text into a sequence in which each matched phrase is
// ONE token separates the jobs: nothing splits the phrase and nothing cases it
// (it is emitted as-written -- that is what an exception means), while position
// is computed over the real sequence, so first and last are correct by
// construction rather than by compensation. No placeholder character is
// involved on this path at all, so text containing one literally is no longer
// a special case either.
interface CasingToken {
  // The token's text exactly as it appears in the text being cased.
  text: string;
  start: number;
  end: number; // exclusive
  // Set only for a phrase-exception token: the AS-WRITTEN form from
  // `exceptions`, emitted verbatim instead of any per-word casing -- the same
  // rule a single-word exception hit follows (a mismatched-case occurrence is
  // rewritten to the exception's casing, not left alone). Always exactly as
  // long as `text`, because phrase matching is case-insensitive but otherwise
  // literal (see findPhraseMatches); capitalization.ts's collectSites depends
  // on the whole transform being length-preserving so it can splice
  // inline-code spans back by offset.
  exception?: string;
}

// A mask run is one inline code span (core/inline-code.ts). It gets its own
// token so it OCCUPIES a position, like a phrase exception (#25610) -- a
// heading opening with a code span must not hand position 0 to the next word.
// `exception` is the run itself so it survives byte for byte; restoreInlineCode
// splices by offset.
const WORD_OR_MASK_RE = new RegExp(
  `${INLINE_CODE_MASK_CHAR}+|[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*`,
  'g'
);

function pushWordTokens(text: string, from: number, to: number, tokens: CasingToken[]): void {
  if (from >= to) return;
  for (const match of text.slice(from, to).matchAll(WORD_OR_MASK_RE)) {
    const start = from + (match.index ?? 0);
    const isMask = match[0].startsWith(INLINE_CODE_MASK_CHAR);
    tokens.push({
      text: match[0],
      start,
      end: start + match[0].length,
      ...(isMask ? { exception: match[0] } : {}),
    });
  }
}

/**
 * Tokenizes `text` into the word sequence the `$`-styles case, with every
 * non-overlapping phrase-exception match collapsed into a single token.
 *
 * Ordinary words are tokenized only in the GAPS between phrase matches, which
 * makes a phrase span a hard token boundary: a word can never straddle one
 * (e.g. with the phrase 'VS Code', the text 'xVS Codey' yields 'x', the
 * phrase, then 'y'). That is exactly the boundary the previous placeholder run
 * produced, since the placeholder sat outside WORD_RE's character class.
 */
function tokenizeCasingWords(text: string, phrases: string[]): CasingToken[] {
  const tokens: CasingToken[] = [];
  let cursor = 0;
  for (const { start, end, exception } of findPhraseMatches(text, phrases)) {
    pushWordTokens(text, cursor, start, tokens);
    tokens.push({ text: text.slice(start, end), start, end, exception });
    cursor = end;
  }
  pushWordTokens(text, cursor, text.length, tokens);
  return tokens;
}

// Trailing whitespace is required: a bare dot is usually a dotted identifier
// or version (`element.focus()`, `v2.0`), not a sentence end. No ':' -- both
// style guides lowercase after a colon unless a full sentence follows, which
// nothing here can detect.
const SENTENCE_BREAK_RE = /[.?!]["'’”)\]]*\s/;

// ABBREVIATIONS is the sentence splitter's own list, reused so the two cannot
// disagree about what ends a sentence (`Cost vs. value` is one sentence).
function gapEndsSentence(text: string, gapStart: number, gap: string): boolean {
  const match = SENTENCE_BREAK_RE.exec(gap);
  if (!match) return false;
  if (match[0][0] !== '.') return true; // '?' and '!' never abbreviate
  return !ABBREVIATIONS.has(lastWordBefore(text, gapStart + (match.index ?? 0)));
}

/**
 * Rebuilds `text` with every word re-cased by `caseWord`, which receives the
 * word, its `index`, the sequence `total`, and whether it opens a sentence.
 * Separators are copied through verbatim.
 *
 * Phrase-exception and mask tokens are emitted as-written but still OCCUPY an
 * index, so a leading one cannot hand position 0 to a neighbour (#25610).
 *
 * Shared by apTitleCase/chicagoTitleCase and capitalization.ts's sentenceCase.
 * Length-preserving whenever `caseWord` is.
 */
export function recaseWords(
  text: string,
  phrases: string[],
  caseWord: (word: string, index: number, total: number, startsSentence: boolean) => string
): string {
  const tokens = tokenizeCasingWords(text, phrases);
  if (tokens.length === 0) return text;

  let result = '';
  let cursor = 0;
  tokens.forEach((token, index) => {
    const separator = text.slice(cursor, token.start);
    const startsSentence = index === 0 || gapEndsSentence(text, cursor, separator);
    result += separator;
    result += token.exception ?? caseWord(token.text, index, tokens.length, startsSentence);
    cursor = token.end;
  });
  return result + text.slice(cursor);
}

// Each hyphen part gets its own exceptions/ALL-CAPS decision first, then
// the same stopword test a standalone word gets. The first/last part also
// inherits the compound's own first/last-word treatment, so a stopword
// part still capitalizes when the compound opens/closes the title.
function capitalizeHyphenated(
  word: string,
  isFirstWord: boolean,
  isLastWord: boolean,
  stopwords: Set<string>,
  exceptionMap: Map<string, string>
): string {
  const parts = word.split('-');
  const lastPartIndex = parts.length - 1;
  return parts
    .map((part, partIndex) => {
      if (part.length === 0) return part; // leading/trailing/doubled hyphen -- nothing to capitalize
      const exceptionHit = exceptionMap.get(part.toLowerCase());
      if (exceptionHit !== undefined) return exceptionHit;
      if (isAllCapsWord(part)) return part;
      if (partIndex === 0 && isFirstWord) return capitalizeWord(part);
      if (partIndex === lastPartIndex && isLastWord) return capitalizeWord(part);
      if (stopwords.has(part.toLowerCase())) return part.toLowerCase();
      return capitalizeWord(part);
    })
    .join('-');
}

function transformWord(
  word: string,
  isFirstWord: boolean,
  isLastWord: boolean,
  stopwords: Set<string>,
  exceptionMap: Map<string, string>
): string {
  // Whole-compound exception check FIRST, before any hyphen splitting: an
  // exceptions entry may itself be an entire hyphenated compound (e.g.
  // 'e-commerce'), which must be preserved as-written rather than falling
  // through to per-part handling below -- $sentence (capitalization.ts's
  // sentenceCase) already treats a hyphenated compound as one token and
  // honors this, so $title must agree on the same documented behavior.
  const exceptionHit = exceptionMap.get(word.toLowerCase());
  if (exceptionHit !== undefined) return exceptionHit;
  // Before the hyphen split: `x-codeSamples` split into parts became
  // `X-codesamples`. An exceptions entry still wins, above.
  if (keepsOwnCasing(word)) return word;
  // Hyphenation check: with no whole-compound exception match, a hyphenated
  // compound is stopword-tested part by part instead (the stopword lists
  // only contain single words, so a whole-string lookup against them would
  // never hit anyway). Per-part exceptions (e.g. 'GitHub' inside
  // 'github-hosted') are still handled inside capitalizeHyphenated.
  if (word.includes('-')) {
    return capitalizeHyphenated(word, isFirstWord, isLastWord, stopwords, exceptionMap);
  }
  if (isFirstWord || isLastWord) return capitalizeWord(word);
  if (stopwords.has(word.toLowerCase())) return word.toLowerCase();
  return capitalizeWord(word);
}

function titleCase(text: string, stopwords: Set<string>, exceptions: string[]): string {
  // Phrase entries become atomic tokens in the sequence recaseWords walks
  // (each emitted as-written, each counting toward first/last position);
  // `wordMap` holds the single-token entries transformWord looks up per word
  // and per hyphen part. Both come from the one shared exception plan.
  const { wordMap, phrases } = buildExceptionPlan(exceptions);
  return recaseWords(text, phrases, (word, index, total) =>
    transformWord(word, index === 0, index === total - 1, stopwords, wordMap)
  );
}

/**
 * AP style: lowercases articles, coordinating conjunctions, and
 * prepositions of 3 letters or fewer -- everything else is capitalized,
 * except `exceptions` (kept as-written) and ALL-CAPS words (left alone).
 * The first and last word are always capitalized.
 */
export function apTitleCase(text: string, exceptions: string[] = []): string {
  return titleCase(text, AP_STOPWORDS, exceptions);
}

/**
 * Chicago style: like AP, but lowercases EVERY preposition regardless of
 * length (not just the 3-letters-or-fewer ones AP lowercases).
 */
export function chicagoTitleCase(text: string, exceptions: string[] = []): string {
  return titleCase(text, CHICAGO_STOPWORDS, exceptions);
}
