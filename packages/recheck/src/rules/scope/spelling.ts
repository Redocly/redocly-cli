import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { maskInlineCode } from '../../core/inline-code.js';
import { newLineRe, offsetToLineColumn } from '../../core/line-endings.js';
import { TECHNICAL_PROPER_NOUNS } from '../../data/proper-nouns.js';
import type { ScopedSegment } from '../../scopes/types.js';
import type { NormalizedRule, Problem, SpellingAssertion } from '../../types/index.js';
import { formatTemplate } from '../token/messages.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';
import { isAllCapsWord } from './title-case.js';

// `nspell` and `dictionary-en` are optional peer dependencies, so they are only
// loaded with a dynamic `import()` when `spelling` is enabled. These small types
// cover what we use, so TypeScript does not need the packages to build.
interface Speller {
  correct(word: string): boolean;
  suggest(word: string): string[];
}

interface DictionaryPair {
  aff: Uint8Array | string;
  dic: Uint8Array | string;
}

// Spellers are cached by dictionary because parsing a dictionary is slow.
// The cache holds promises, so concurrent callers share one load.
const DEFAULT_DICTIONARY_KEY = '\0default';
const spellerCache = new Map<string, Promise<Speller>>();

/**
 * Turns a `dictionary` path (without the `.aff`/`.dic` extension) into the two file paths.
 * Relative paths are resolved from `process.cwd()`.
 */
export function resolveDictionaryPaths(dictionaryPath: string): { aff: string; dic: string } {
  const resolved = path.isAbsolute(dictionaryPath)
    ? dictionaryPath
    : path.join(process.cwd(), dictionaryPath);
  return { aff: `${resolved}.aff`, dic: `${resolved}.dic` };
}

/** Reads a custom Hunspell `.aff`/`.dic` pair from disk. */
async function readCustomDictionary(dictionaryPath: string): Promise<DictionaryPair> {
  const { aff: affPath, dic: dicPath } = resolveDictionaryPaths(dictionaryPath);
  const [aff, dic] = await Promise.all([fs.readFile(affPath), fs.readFile(dicPath)]);
  return { aff, dic };
}

/** Loads the custom dictionary if `options.dictionary` is set, else the default English one. */
async function loadDictionary(options: SpellingAssertion): Promise<DictionaryPair> {
  if (options.dictionary) return readCustomDictionary(options.dictionary);
  const mod = (await import('dictionary-en')) as { default: DictionaryPair };
  return mod.default;
}

function loadSpeller(options: SpellingAssertion): Promise<Speller> {
  const cacheKey =
    options.dictionary && options.dictionary.length > 0
      ? options.dictionary
      : DEFAULT_DICTIONARY_KEY;
  const cached = spellerCache.get(cacheKey);
  if (cached) return cached;

  const loading = (async () => {
    const [{ default: nspell }, dictionary] = await Promise.all([
      import('nspell') as Promise<{ default: (dict: DictionaryPair) => Speller }>,
      loadDictionary(options),
    ]);
    return nspell(dictionary);
  })();
  spellerCache.set(cacheKey, loading);
  // Remove a failed load from the cache so a later call can retry. Callers still
  // see the original error because they await the same promise.
  loading.catch(() => {
    // Only remove it if it is still this promise; another call may have replaced it.
    if (spellerCache.get(cacheKey) === loading) {
      spellerCache.delete(cacheKey);
    }
  });
  return loading;
}

// Letter runs, with an optional apostrophe suffix so "don't" is one word.
const WORD_RE = /\p{L}+(?:['’]\p{L}+)?/gu;

// True when a digit touches the word, as in 'sha256' or 'log4j'. Those letters
// are part of an identifier, not a word to spell-check.
function isDigitAdjacent(text: string, start: number, end: number): boolean {
  const before = text[start - 1];
  const after = text[end];
  return /\d/.test(before ?? '') || /\d/.test(after ?? '');
}

// On the first line, `segment.content` can start mid-line (a heading excludes
// its '## '), so add `startColumn` to get the real column.
function toSourceColumn(segment: ScopedSegment, lineNumber: number, column: number): number {
  return lineNumber === 1 ? segment.startColumn + (column - 1) : column;
}

/** Returns `''` for no suggestions, or `' — did you mean: a, b, c?'`. */
function formatSuggestionSuffix(suggestions: string[]): string {
  if (suggestions.length === 0) return '';
  return ` — did you mean: ${suggestions.join(', ')}?`;
}

// Used when the rule has no `message`. The slots are the word and the suggestion suffix.
const FALLBACK_MESSAGE = 'Unknown word "%s"%s';

// Names like 'Node.js' and 'VS Code' are split into words, since spelling checks single words.
const BUILTIN_VOCAB_WORDS: readonly string[] = TECHNICAL_PROPER_NOUNS.flatMap((entry) =>
  entry.split(/[\s.]+/).filter((part) => part.length > 0)
).map((word) => word.toLowerCase());

const execute = async (
  rule: NormalizedRule,
  file: string,
  ctx: ScopeRuleContext
): Promise<Problem[]> => {
  const options = (rule.assertions['spelling'] ?? {}) as SpellingAssertion;

  let speller: Speller;
  try {
    speller = await loadSpeller(options);
  } catch (error) {
    // Config validation usually catches a missing peer or dictionary first. If it did
    // not, throw so the runner reports an error instead of silently finding nothing.
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`spelling: failed to load dictionary — ${detail}`);
  }

  const vocab = new Set((options.vocab ?? []).map((word) => word.toLowerCase()));
  // Add the built-in words to the config's own `vocab` unless `builtinVocabulary` is false.
  if (options.builtinVocabulary !== false) {
    for (const word of BUILTIN_VOCAB_WORDS) vocab.add(word);
  }
  const ignorePatterns: RegExp[] = [];
  for (const pattern of options.ignore ?? []) {
    try {
      ignorePatterns.push(new RegExp(pattern));
    } catch {
      // ignore invalid regex
    }
  }

  const problems: Problem[] = [];

  for (const segment of ctx.segments) {
    const masked = maskInlineCode(segment.content);
    // Split on newLineRe so CRLF content does not keep a trailing '\r'.
    const contentLines = segment.content.split(newLineRe);

    for (const match of masked.matchAll(WORD_RE)) {
      const word = match[0];
      const offset = match.index ?? 0;

      if (vocab.has(word.toLowerCase())) continue;
      if (ignorePatterns.some((re) => re.test(word))) continue;
      if (isAllCapsWord(word)) continue;
      if (isDigitAdjacent(masked, offset, offset + word.length)) continue;
      if (speller.correct(word)) continue;

      const { line: lineNumber, column } = offsetToLineColumn(segment.content, offset);
      const suggestions = speller.suggest(word).slice(0, 3);

      problems.push({
        file,
        line: segment.startLine + lineNumber - 1,
        column: toSourceColumn(segment, lineNumber, column),
        text: contentLines[lineNumber - 1] ?? '',
        match: word,
        ruleName: rule.name,
        severity: rule.severity,
        message: formatTemplate(
          rule.message ?? FALLBACK_MESSAGE,
          word,
          formatSuggestionSuffix(suggestions)
        ),
      });
    }
  }

  return problems;
};

export const spelling: ScopeRule = { id: 'spelling', fixable: false, execute };
