import type { ReadabilityFormula } from '../metrics/index.js';

// Assertion type definitions
export interface SwapAssertion {
  ignoreCase?: boolean;
  wordBoundary?: boolean;
  keysAreRegex?: boolean;
  pairs: Record<string, string>;
  /**
   * Whether inline code spans (`` `like this` ``) are scanned for matches.
   * Default `false`: a match inside inline code is skipped (by range, not
   * by masking the text -- see core/inline-code.ts), so a swap pair like
   * `master -> primary` doesn't fire inside `` `git checkout master` ``.
   * Set `true` to scan code spans too.
   */
  includeCode?: boolean;
}

// `negate` was removed from this shape: it never functioned in ANY version
// of the engine (the check always sat inside the match-iteration loop, so
// `negate: true` reported nothing, ever, and a pattern's absence never
// reported either). Config validation rejects it explicitly — see
// validatePatternOptions in ../config/validate.ts. Existence checks
// ("flag when pattern is absent") are planned as a Vale-parity feature.
export interface PatternAssertion {
  tokens: string[];
  ignoreCase?: boolean;
  nonword?: boolean;
  /**
   * Whether inline code spans (`` `like this` ``) are scanned for matches.
   * Default `false`: a match inside inline code is skipped (by range, not
   * by masking the text -- see core/inline-code.ts), so a token like
   * `master` doesn't fire inside `` `git checkout master` ``. Set `true`
   * to scan code spans too.
   */
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

// Vale-parity `occurrence` check: counts regex matches within each segment
// and flags the segment when the count falls outside `[min, max]`. At
// least one of `min`/`max` is required (enforced by config validation).
export interface OccurrenceAssertion {
  pattern: string;
  min?: number;
  max?: number;
  ignoreCase?: boolean;
}

// Vale-parity `repetition` check (fixable): flags an adjacent repeated word
// and collapses the pair back to one occurrence. `pattern` defaults to
// `\w+`; `ignoreCase` defaults to TRUE (unlike every other assertion)
// because "The the" is the common typo this check exists to catch. See
// rules/scope/repetition.ts.
export interface RepetitionAssertion {
  pattern?: string;
  ignoreCase?: boolean;
}

// Vale-parity `consistency` check (fixable): each `either` entry's key and
// value are two variants, matched as regex-escaped literals with `\b` word
// boundaries (like `swap` keys). Whichever variant appears FIRST in the
// file wins file-wide; every later occurrence of the other variant is
// flagged and fixed to the winner as written in the config. See
// rules/scope/consistency.ts.
export interface ConsistencyAssertion {
  either: Record<string, string>;
  ignoreCase?: boolean;
}

// Vale-parity `conditional` check (detection-only): if `first` matches
// anywhere within the rule's scoped segments, `second` must exist somewhere
// in the whole file -- tested against the full raw file content, so e.g. a
// `second` match inside a code block still satisfies a rule scoped to
// `paragraph`. When `second` is absent, every position-deduped `first`
// match becomes its own problem. Both are raw user regex patterns (not
// escaped literals like `swap`/`consistency`); an invalid regex silently
// produces zero problems at runtime. See rules/scope/conditional.ts.
export interface ConditionalAssertion {
  first: string;
  second: string;
  ignoreCase?: boolean;
}

// Vale-parity `capitalization` check: `match` is one of `$title`,
// `$sentence`, `$lower`, `$upper`, or else a raw regex the WHOLE segment
// text must satisfy. Fixable for the four `$`-styles only; a custom regex
// `match` is detection-only (no transform to derive a fix from).
// `exceptions` lists words that keep their exact as-written casing
// everywhere, overriding every other rule. `style` selects the AP vs
// Chicago stopword list used by `$title` (default 'ap'); setting it
// alongside other `match` values is a documented no-op, not an error.
// Backtick-delimited inline code spans are frozen -- never flagged or
// rewritten. See rules/scope/capitalization.ts.
//
// `builtinVocabulary` (default `true`): whether `../data/proper-nouns.ts`'s
// `TECHNICAL_PROPER_NOUNS` is unioned into `exceptions` before matching --
// see capitalization.ts's `collectSites` (shared by `execute`/`fix`). Set
// `false` to restore strict pre-built-in behavior (a closed vocabulary of
// only this rule's own `exceptions`).
export interface CapitalizationAssertion {
  match: string;
  exceptions?: string[];
  style?: 'ap' | 'chicago';
  builtinVocabulary?: boolean;
}

// `metric` check: scores the WHOLE DOCUMENT's prose with one of the six
// readability formulas from `../metrics/formulas.ts` and flags the file
// once when the score falls outside `[min, max]`. At least one of
// `min`/`max` is required, same as `OccurrenceAssertion`. See
// rules/scope/metric.ts for why this is whole-document (not
// scope-selector-driven) and for the non-prose stripping applied first.
export interface MetricAssertion {
  formula: ReadabilityFormula;
  min?: number;
  max?: number;
}

// Vale-parity `spelling` check (detection-only): tokenizes each scoped
// segment's text into words and flags any word an nspell/Hunspell speller
// doesn't recognize, with up to three suggested corrections. `nspell` and
// its default dictionary (`dictionary-en`) are OPTIONAL peer dependencies,
// loaded lazily only when a `spelling` assertion actually runs; config
// validation reports an actionable install command when they're missing.
// Code blocks are never spell-checked when the rule is scoped to prose
// (they're their own `scope: 'code'` segment); inline code spans are
// masked out before tokenizing. See rules/scope/spelling.ts.
export interface SpellingAssertion {
  /**
   * Base path (WITHOUT the `.aff`/`.dic` extension) to a custom Hunspell
   * dictionary pair, resolved relative to `process.cwd()` unless absolute.
   * Omit to use the default English dictionary (`dictionary-en`).
   */
  dictionary?: string;
  /** Extra known-good words, matched case-insensitively; never flagged. */
  vocab?: string[];
  /**
   * Regex patterns; a token matching any of them is never flagged. An
   * invalid pattern is silently ignored.
   */
  ignore?: string[];
  /**
   * Default `true`: whether `../data/proper-nouns.ts`'s
   * `TECHNICAL_PROPER_NOUNS` is unioned into the accepted-word set alongside
   * `vocab` -- see spelling.ts's `execute`. Multi-token entries are split on
   * whitespace/dots and each part accepted individually (correct for a
   * per-word spell check, unlike `capitalization`'s whole-phrase matching --
   * see spelling.ts's doc comment for that asymmetry). Set `false` to
   * restore strict pre-built-in behavior.
   */
  builtinVocabulary?: boolean;
}

// Recheck-original `length` check (detection-only): measures each scoped
// segment's size -- in characters, words, or sentences -- and flags a
// segment whose measurement falls outside `[min, max]`. At least one of
// `min`/`max` is required, same reasoning as `OccurrenceAssertion`/
// `MetricAssertion`. Unlike `metric` (always whole-document), `length`
// honors whatever `scope` the rule configures -- e.g. `scope: alt` to cap
// image alt text, or `scope: sentence` to cap sentence length. Later
// style-guide presets (e.g. `recheck/microsoft`) use `unit: 'characters'`
// to enforce a 150-character alt-text limit. See rules/scope/length.ts.
export interface LengthAssertion {
  unit: 'characters' | 'words' | 'sentences';
  min?: number;
  max?: number;
}

/**
 * Escape-hatch options shape for the 53 markdownlint-parity token rules
 * (`line-length`, `ul-style`, `no-duplicate-heading`, `heading-style`, and
 * so on — see `rules/token/index.ts`'s `allTokenRules`). Each token rule
 * declares its own option names and defaults on its `TokenRule.defaults`
 * object (see e.g. `rules/token/line-length.ts`) rather than a dedicated
 * named interface here — there are too many (and they change too often
 * across rule ports) to keep in lockstep with hand-written interfaces
 * without one inevitably drifting. This permissive index signature is what
 * lets a typed `RecheckConfig` literal set e.g.
 * `assertions: { 'line-length': { lineLength: 120 } }` without TS2353;
 * runtime shape checking for token-rule options happens in each rule's own
 * `check()`, not at the type level.
 */
export interface TokenRuleOptions {
  [option: string]: unknown;
}

// Union type for all possible assertion configurations. The named
// interfaces above are the native (non-markdownlint-ported) scope rules'
// option shapes. `TokenRuleOptions` is the escape hatch that keeps this
// union open for the 53 markdownlint-parity token rules' option shapes,
// none of which get their own named interface here (see its own doc
// comment). PR #24801 removed the deprecated pre-parity legacy assertion
// ids (`max-line-length`, `bullet-style`, `no-duplicate-headings`,
// `no-broken-fragment-links`) and their option-translation layer entirely
// — those ids are no longer valid config, so their option interfaces are
// gone too; see git history for the pre-removal shapes.
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
