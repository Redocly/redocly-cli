import type { ReadabilityFormula } from '../metrics/index.js';

export interface SwapAssertion {
  ignoreCase?: boolean;
  wordBoundary?: boolean;
  keysAreRegex?: boolean;
  pairs: Record<string, string>;
  /** Whether inline code spans (`` `like this` ``) are scanned for matches. Default `false`. */
  includeCode?: boolean;
}

// `negate` is not supported: config validation rejects it.
export interface PatternAssertion {
  tokens: string[];
  ignoreCase?: boolean;
  nonword?: boolean;
  /** Whether inline code spans (`` `like this` ``) are scanned for matches. Default `false`. */
  includeCode?: boolean;
}

export interface SemanticLineBreaksAssertion {
  mode: 'sentence' | 'phrase';
  maxPhrase?: number;
  ignoreCodeBlocks?: boolean;
  ignoreTables?: boolean;
}

export interface MaxImageSizeAssertion {
  /** Maximum image size in KB. Default: 100 */
  maxSizeKB?: number;
  /** File extensions to check. Default: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] */
  extensions?: string[];
}

// Counts regex matches in each segment and flags it when the count is outside `[min, max]`.
// At least one of `min` and `max` is required (checked by config validation).
export interface OccurrenceAssertion {
  pattern: string;
  min?: number;
  max?: number;
  ignoreCase?: boolean;
}

// Flags an adjacent repeated word and fixes it to one occurrence. `pattern` defaults to `\w+`.
// `ignoreCase` defaults to `true` (unlike other assertions), because "The the" is the typo this
// check exists to catch.
export interface RepetitionAssertion {
  pattern?: string;
  ignoreCase?: boolean;
}

// Each `either` entry's key and value are two variants, matched as literal words. The variant
// that appears first in the file wins; later uses of the other one are flagged and fixed to it.
export interface ConsistencyAssertion {
  either: Record<string, string>;
  ignoreCase?: boolean;
}

// If `first` matches in the scoped segments, `second` must match somewhere in the whole file
// (including code blocks). Otherwise each `first` match is reported. Both are raw regexes;
// an invalid regex reports nothing.
export interface ConditionalAssertion {
  first: string;
  second: string;
  ignoreCase?: boolean;
}

// `match` is `$title`, `$sentence`, `$lower`, `$upper`, or a raw regex that the whole segment
// must match. Only the `$` styles are fixable. `exceptions` are words that keep their casing.
// `style` picks the AP or Chicago stopword list for `$title` (default 'ap'). Inline code is
// never flagged or changed. `builtinVocabulary` (default `true`) adds the built-in list of
// technical proper nouns to `exceptions`.
export interface CapitalizationAssertion {
  match: string;
  exceptions?: string[];
  style?: 'ap' | 'chicago';
  builtinVocabulary?: boolean;
}

// Size formulas measure how much prose a document has instead of how readable it is.
// `reading-time` is minutes at `wordsPerMinute`, rounded to one decimal.
export type SizeFormula = 'word-count' | 'sentence-count' | 'reading-time';

// Scores the whole document's prose with a readability or size formula and flags the file once
// when the score is outside `[min, max]`. At least one of `min` and `max` is required.
export interface MetricAssertion {
  formula: ReadabilityFormula | SizeFormula;
  min?: number;
  max?: number;
  /** Reading speed for `reading-time`, default 200. Not valid with any other formula. */
  wordsPerMinute?: number;
}

// Flags words that nspell (Hunspell) does not recognize, with up to three suggestions.
// `nspell` and `dictionary-en` are optional peer dependencies, loaded only when this runs.
// Inline code spans are masked out before tokenizing.
export interface SpellingAssertion {
  /**
   * Base path (without `.aff` / `.dic`) of a custom Hunspell dictionary, relative to
   * `process.cwd()` unless absolute. Omit to use the default English dictionary.
   */
  dictionary?: string;
  /** Extra known-good words, matched case-insensitively. */
  vocab?: string[];
  /** Regex patterns; a token matching any of them is never flagged. Invalid patterns are ignored. */
  ignore?: string[];
  /**
   * Default `true`: also accept the built-in list of technical proper nouns. Multi-word entries
   * are split on whitespace and dots, and each part is accepted on its own. Set `false` to
   * accept only `vocab`.
   */
  builtinVocabulary?: boolean;
}

// Measures each scoped segment in characters, words or sentences and flags it when the value
// is outside `[min, max]`. At least one of `min` and `max` is required. It uses the rule's
// `scope`, e.g. `scope: alt` to limit alt text length.
export interface LengthAssertion {
  unit: 'characters' | 'words' | 'sentences';
  min?: number;
  max?: number;
}

/**
 * Options for the markdownlint-parity token rules. Each rule declares its own options and
 * defaults on `TokenRule.defaults`, so this only allows any key. Options are checked in each
 * rule's own `check()`.
 */
export interface TokenRuleOptions {
  [option: string]: unknown;
}

// All possible assertion configurations. `TokenRuleOptions` keeps the union open for token rules.
export type AssertionConfig =
  | SwapAssertion
  | PatternAssertion
  | SemanticLineBreaksAssertion
  | MaxImageSizeAssertion
  | OccurrenceAssertion
  | RepetitionAssertion
  | ConsistencyAssertion
  | ConditionalAssertion
  | CapitalizationAssertion
  | MetricAssertion
  | SpellingAssertion
  | LengthAssertion
  | TokenRuleOptions;
