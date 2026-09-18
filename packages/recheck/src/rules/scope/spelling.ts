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

// -- Optional peers -------------------------------------------------------
//
// `nspell` and its default dictionary (`dictionary-en`) are OPTIONAL peer
// dependencies (see package.json's `peerDependenciesMeta`), referenced only
// via dynamic `import()` and only reached when a config actually enables
// `spelling` — never merely by this module being imported. Config
// validation attempts the same imports up front, so a missing peer fails
// with an actionable install command at config-load time (see
// `checkSpellingPeerDependencies` in ../../config/validate.ts).
//
// Minimal structural types for what's actually used from each package —
// deliberately NOT `import type` of the real packages' own types, which
// would force TypeScript to resolve them at typecheck/build time.
interface Speller {
  correct(word: string): boolean;
  suggest(word: string): string[];
}

interface DictionaryPair {
  aff: Uint8Array | string;
  dic: Uint8Array | string;
}

// Module-level cache, keyed by dictionary source: parsing a Hunspell
// dictionary is expensive (the bundled English `.dic` alone is 500+KB), so
// one speller instance is reused for the lifetime of the process. A cached
// PROMISE (not a resolved value) so concurrent first callers await the same
// in-flight load instead of racing separate ones.
const DEFAULT_DICTIONARY_KEY = '\0default';
const spellerCache = new Map<string, Promise<Speller>>();

/**
 * Resolves a `dictionary` option value (the shared base path WITHOUT the
 * `.aff`/`.dic` extension) to its two file paths. Resolved relative to
 * `process.cwd()`, not the config file's directory — consistent with every
 * other file-shaped config value in this package; an absolute path is used
 * as-is.
 *
 * Exported so `../../config/validate.ts`'s dictionary-file-existence check
 * (see `checkSpellingPeerDependencies` there) shares this EXACT resolution
 * rule instead of re-implementing it — a config that validates cleanly must
 * always name the same files `readCustomDictionary` below actually reads at
 * lint time, or validate() and the runtime could silently disagree about
 * which files a `dictionary` path names.
 */
export function resolveDictionaryPaths(dictionaryPath: string): { aff: string; dic: string } {
  const resolved = path.isAbsolute(dictionaryPath)
    ? dictionaryPath
    : path.join(process.cwd(), dictionaryPath);
  return { aff: `${resolved}.aff`, dic: `${resolved}.dic` };
}

/**
 * Reads a custom Hunspell `.aff`/`.dic` pair from disk. `dictionaryPath` is
 * the shared base path WITHOUT the extension (e.g. `'./dict/custom'` reads
 * `./dict/custom.aff` and `./dict/custom.dic`) — see `resolveDictionaryPaths`
 * for the resolution rule.
 */
async function readCustomDictionary(dictionaryPath: string): Promise<DictionaryPair> {
  const { aff: affPath, dic: dicPath } = resolveDictionaryPaths(dictionaryPath);
  const [aff, dic] = await Promise.all([fs.readFile(affPath), fs.readFile(dicPath)]);
  return { aff, dic };
}

/**
 * Loads the `{aff, dic}` pair `nspell` needs: a custom pair from disk when
 * `options.dictionary` is set, otherwise the bundled default English
 * dictionary. `dictionary-en@4` exports a plain `{ aff, dic }` object as
 * its ESM default — NOT the v3 Node-style callback API some nspell examples
 * still show — so there is no callback to bridge, just a destructure.
 */
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
  // Evict on rejection: a failed load (missing peer, unreadable/missing
  // custom dictionary file, etc.) must not poison this cache key for the
  // rest of the process — a later call after the failure clears (peer
  // installed, file becomes readable) should retry cleanly instead of
  // forever replaying the same dead rejection (the High-severity finding
  // this fixes). Attached as a SEPARATE `.catch` subscriber on `loading`
  // itself, never reassigning `loading` or the cached map value — every
  // real caller awaiting the SAME cached promise (via this function's own
  // `return loading` below, or a concurrent in-flight caller that read
  // `cached` above) still observes and handles the original rejection
  // themselves; this handler only ever additionally deletes the now-dead
  // cache entry alongside them, so it can never swallow the rejection a
  // consumer sees.
  loading.catch(() => {
    // Only remove the entry if it's STILL this exact rejected promise — a
    // concurrent caller could in principle have already evicted and
    // replaced it with a newer, unrelated load, which this must never clobber.
    if (spellerCache.get(cacheKey) === loading) {
      spellerCache.delete(cacheKey);
    }
  });
  return loading;
}

// -- Tokenization -----------------------------------------------------------

// Letter runs, with an optional apostrophe-joined suffix so contractions
// ("don't") tokenize as one word. `\p{L}` can never match a digit, so
// "skip tokens containing digits" is true by construction — but a
// digit-adjacent identifier like 'sha256' still tokenizes to its letter-only
// fragments ('sha'), which nspell would flag as misspellings. The
// `isDigitAdjacent` guard below skips those.
const WORD_RE = /\p{L}+(?:['’]\p{L}+)?/gu;

// True when the character immediately before `start` or after `end` is a
// digit — used to skip a WORD_RE match that is really a truncated fragment
// of a digit-bearing identifier ('sha256' -> 'sha', 'log4j' -> 'log' and
// 'j') rather than a standalone word.
function isDigitAdjacent(text: string, start: number, end: number): boolean {
  const before = text[start - 1];
  const after = text[end];
  return /\d/.test(before ?? '') || /\d/.test(after ?? '');
}

// Backtick-delimited inline code spans (extractScopes keeps them as raw
// text in prose segment content) are masked out with the shared,
// length-preserving maskInlineCode (core/inline-code.ts) so every remaining
// token's offset stays aligned with `segment.content` -- see there for the
// CommonMark span-recognition contract. Fenced/indented CODE BLOCKS need no
// handling here: they are their own `scope: 'code'` segment, so a
// prose-scoped rule never sees one (a rule explicitly scoped to `all`/`code`
// still does -- see the README's `spelling` section).

// On the segment's first line, segment.content starts mid-source-line (e.g.
// a heading's content excludes the '## ' marker), so segment.startColumn
// must be added — see pattern.ts's toSourceColumn.
function toSourceColumn(segment: ScopedSegment, lineNumber: number, column: number): number {
  return lineNumber === 1 ? segment.startColumn + (column - 1) : column;
}

/**
 * Formats the fallback message's second `%s` slot: `''` for zero
 * suggestions, or `' — did you mean: a, b, c?'` for one to three.
 * Exported for direct unit testing.
 */
export function formatSuggestionSuffix(suggestions: string[]): string {
  if (suggestions.length === 0) return '';
  return ` — did you mean: ${suggestions.join(', ')}?`;
}

// Fallback when a programmatically-built rule has no `message` (validate()
// requires one). %s slots: the unrecognized word, then
// formatSuggestionSuffix's output.
const FALLBACK_MESSAGE = 'Unknown word "%s"%s';

// The built-in vocabulary's multi-token entries ('Node.js', 'VS Code') are
// split into their individual word-level parts up front: unlike
// `capitalization`'s whole-phrase matching (title-case.ts's
// buildExceptionPlan/recaseWords), this rule's WORD_RE (below)
// tokenizes per word, so a phrase entry must contribute EACH of its parts
// ('Node', 'js', 'VS', 'Code') to the accepted-word set rather than the
// phrase as a whole -- the correct behavior for a per-word spell check, and
// a deliberate, documented asymmetry with `capitalization` (see
// SpellingAssertion's `builtinVocabulary` doc comment in ../../types/index.js).
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
    // The optional peer (or a custom dictionary file) failed to load.
    // validate()'s peer-availability + dictionary-file-existence checks
    // (see checkSpellingPeerDependencies in ../../config/validate.ts)
    // normally catch this ahead of time with an actionable error — but a
    // caller that reaches execute() directly (bypassing validate()), or a
    // TOCTOU where the dictionary file disappears/breaks between validate()
    // and this run, must NOT fail closed with zero problems here: that used
    // to silently disable spelling for the rest of the process (the
    // rejected promise stayed cached — see spellerCache/loadSpeller above —
    // and every later call replayed it). Rethrow instead, so runner.ts's own
    // internalError catch (core/runner.ts) surfaces exactly ONE visible
    // problem for this file/rule rather than a silent [].
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`spelling: failed to load dictionary — ${detail}`);
  }

  const vocab = new Set((options.vocab ?? []).map((word) => word.toLowerCase()));
  // Unioned in unless explicitly opted out -- same `builtinVocabulary` flag
  // and union-not-replace reasoning as `capitalization` (see
  // rules/scope/capitalization.ts's `collectSites`), so a config's own
  // `vocab` composes with the built-ins rather than overriding them.
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
    // newLineRe, not '\n': a bare split leaves a trailing '\r' on CRLF content.
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
