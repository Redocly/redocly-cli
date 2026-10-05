// AP and Chicago title-case rules, used by the `$title` check in capitalization.ts.
// They work on plain text only.
//
// In both styles:
// - The first and last word are always capitalized.
// - A word in `exceptions` is replaced by its spelling from that list (e.g. 'GitHub').
// - An ALL-CAPS word such as 'API' is left as written.
// - Each part of a hyphenated word follows the same rules as a single word.
//
// AP lowercases articles, conjunctions and prepositions of three letters or fewer.
// Chicago lowercases all prepositions.
import { INLINE_CODE_MASK_CHAR } from '../../core/inline-code.js';
import { ABBREVIATIONS, lastWordBefore } from '../../scopes/sentences.js';

const ARTICLES = ['a', 'an', 'the'];
const COORDINATING_CONJUNCTIONS = ['and', 'but', 'or', 'nor', 'for', 'so', 'yet'];
// Both AP and Chicago lowercase these.
const SHORT_PREPOSITIONS = ['at', 'by', 'in', 'of', 'off', 'on', 'out', 'to', 'up', 'via'];
// Chicago lowercases these; AP capitalizes them.
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

/** True for an ALL-CAPS word of 2+ letters, like 'API' or 'HTML5'. Digits are ignored. */
export function isAllCapsWord(word: string): boolean {
  const letters = word.replace(/[^A-Za-z]/g, '');
  return letters.length >= 2 && letters === letters.toUpperCase();
}

/** True for `v2` or `v3`, but not for a word like `vector3`. */
export function isVersionToken(word: string): boolean {
  return /^v\d+$/i.test(word);
}

/** True for `x-metadata` or `x-codeSamples`. Case-sensitive, so `X-ray` is not matched. */
export function isVendorExtensionToken(word: string): boolean {
  return /^x-./.test(word);
}

/** True for tokens that keep their casing. Check this before splitting on hyphens. */
export function keepsOwnCasing(word: string): boolean {
  return isAllCapsWord(word) || isVersionToken(word) || isVendorExtensionToken(word);
}

function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// Splits `exceptions` into single words and multi-word phrases. Shared with
// capitalization.ts's sentenceCase.
export interface ExceptionPlan {
  // Single-word entries, keyed by lowercase word.
  wordMap: Map<string, string>;
  // Entries with whitespace or a dot, longest first so 'Visual Studio Code'
  // wins over 'VS Code'.
  phrases: string[];
}

export function buildExceptionPlan(exceptions: string[]): ExceptionPlan {
  const phrases = exceptions.filter((e) => /[\s.]/.test(e)).sort((a, b) => b.length - a.length);
  const phraseSet = new Set(phrases);
  const wordMap = new Map<string, string>();
  for (const exception of exceptions) {
    if (phraseSet.has(exception)) continue; // phrases are matched separately
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
  exception: string; // the phrase as written in `exceptions`
}

// Finds non-overlapping, case-insensitive occurrences of the phrases. A match is
// always as long as the phrase, so replacing it does not shift later offsets.
// `phrases` is longest first, so a shorter phrase cannot match inside a longer one.
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

// A phrase exception is one token, so it counts as a word for first/last position.
// Otherwise the word next to it would wrongly become the first or last word.
interface CasingToken {
  text: string;
  start: number;
  end: number; // exclusive
  // Set for phrase exceptions and code spans: this text is used as written.
  // It is always as long as `text`, so code spans can be put back by offset.
  exception?: string;
}

// A word is letters and digits, optionally joined by hyphens or apostrophes.
// A run of mask characters is an inline code span; it also takes a position,
// so a heading that starts with code does not make the next word the first.
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

/** Splits `text` into words, with each phrase exception as a single token. */
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

// Needs trailing whitespace, because a dot is often part of an identifier or
// version (`element.focus()`, `v2.0`). A colon does not end a sentence.
const SENTENCE_BREAK_RE = /[.?!]["'’”)\]]*\s/;

// Uses the sentence splitter's abbreviation list, so `Cost vs. value` is one sentence.
function gapEndsSentence(text: string, gapStart: number, gap: string): boolean {
  const match = SENTENCE_BREAK_RE.exec(gap);
  if (!match) return false;
  if (match[0][0] !== '.') return true; // '?' and '!' always end a sentence
  return !ABBREVIATIONS.has(lastWordBefore(text, gapStart + (match.index ?? 0)));
}

/**
 * Rebuilds `text` with each word re-cased by `caseWord`, which gets the word, its
 * index, the word count and whether it starts a sentence. Separators are kept.
 * Phrase exceptions and code spans are kept as written but still count as words.
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

// Each part gets the same rules as a single word. The first and last parts
// are capitalized when the whole word is first or last in the title.
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
      if (part.length === 0) return part; // leading, trailing or doubled hyphen
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
  // Check exceptions before splitting on hyphens; an entry can be a whole
  // hyphenated word like 'e-commerce'.
  const exceptionHit = exceptionMap.get(word.toLowerCase());
  if (exceptionHit !== undefined) return exceptionHit;
  // Also before the split, or `x-codeSamples` would become `X-codesamples`.
  if (keepsOwnCasing(word)) return word;
  if (word.includes('-')) {
    return capitalizeHyphenated(word, isFirstWord, isLastWord, stopwords, exceptionMap);
  }
  if (isFirstWord || isLastWord) return capitalizeWord(word);
  if (stopwords.has(word.toLowerCase())) return word.toLowerCase();
  return capitalizeWord(word);
}

function titleCase(text: string, stopwords: Set<string>, exceptions: string[]): string {
  const { wordMap, phrases } = buildExceptionPlan(exceptions);
  return recaseWords(text, phrases, (word, index, total) =>
    transformWord(word, index === 0, index === total - 1, stopwords, wordMap)
  );
}

/** AP style: lowercases articles, conjunctions and prepositions of 3 letters or fewer. */
export function apTitleCase(text: string, exceptions: string[] = []): string {
  return titleCase(text, AP_STOPWORDS, exceptions);
}

/** Chicago style: like AP, but lowercases every preposition. */
export function chicagoTitleCase(text: string, exceptions: string[] = []): string {
  return titleCase(text, CHICAGO_STOPWORDS, exceptions);
}
