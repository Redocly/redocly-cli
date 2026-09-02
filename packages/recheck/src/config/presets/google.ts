import type { BaseRule, RecheckConfig } from '../../types/index.js';

/**
 * `recheck/google` — Google's developer documentation style guide
 * (https://developers.google.com/style), adapted to Recheck assertions.
 *
 * Source: Google developer documentation style guide
 * Canonical URL: https://developers.google.com/style
 * License: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
 * Sync date: 2026-07-29
 *
 * Modification note: rules are adapted to Recheck's assertion vocabulary
 * (`swap`, `pattern`, `capitalization`, `length`, plus a handful of
 * markdownlint-parity/Recheck-original token rules) and wording is
 * paraphrased into rule messages rather than quoted verbatim. See
 * `packages/recheck/presets/google/PROVENANCE.md` for the full rule ->
 * source page -> quote -> verdict table (including every candidate rule
 * that was considered and NOT shipped, and why), and
 * `packages/recheck/presets/google/sources.json` for the fetched-page
 * hashes drift detection needs.
 *
 * PROVENANCE DISCIPLINE (why this file looks the way it does): every rule
 * below was confirmed against a LIVE fetch of its cited page by one of five
 * independent verification passes (see PROVENANCE.md's header for how those
 * were run). ~380 candidate rules/entries were checked and 6 were outright
 * fabrications invented by an earlier research summarization pass (a
 * fictitious Flesch-reading-ease threshold, three word-list entries that
 * don't exist on the live page, one wrong replacement value, one dropped
 * word-list entry) — none of the six are anywhere in this file. Every rule
 * here also carries a `link:` to the page it comes from, per spec §3.
 *
 * SEVERITY POLICY: `error` is reserved for rules that check pure document
 * STRUCTURE — heading hierarchy/uniqueness, list-item mechanics, table
 * mechanics, link placement, alt-text presence, sentence length — where a
 * violation is unambiguous and mechanical. Every word-choice, terminology,
 * punctuation-convention, and phrasing rule is `warn`, matching spec §2's
 * "Word choice, terminology, phrasing (swap/pattern prose rules) -> warn"
 * class. This is a slightly simpler two-way split than the spec's prose
 * implies (a few of these — Oxford-comma-style punctuation mechanics —
 * could arguably be `error`), applied uniformly for predictability; see
 * PROVENANCE.md's "Severity" note for the one-line rationale.
 *
 * Four rules below are named exceptions to that split, not silent
 * inconsistencies with it: `no-code-in-heading` is heading-scoped (in the
 * STRUCTURE family above by location) but ships at `warn` because the
 * guide states it with hedged wording ("Avoid code items in headings,"
 * not "don't"). `no-numbered-headings` is also heading-scoped and the
 * guide states IT unconditionally, but ships at `warn` because the
 * shipped pattern is a narrowed heuristic (bare leading ordinals and
 * `Step N`/`Part N` markers only, to keep the false-positive rate low),
 * not a complete detector of every way a heading could number a
 * sequence. `emphasis-style` and `strong-style` ship at `warn` because
 * the guide states its markup preference as a recommendation ("we
 * recommend underscores," "it's best to use double asterisk"), not an
 * unconditional "don't." See PROVENANCE.md's severity note for the full
 * per-rule rationale.
 *
 * DETECTION-ONLY BY DESIGN: this preset never auto-fixes any rule, full
 * stop. `buildGooglePreset()` forces `fix: false` onto every rule it
 * returns, structurally, regardless of what an individual
 * `swapRule()`/`patternRule()`/`tokenRule()` call sets — see the loop at
 * the end of that function. Adversarial testing of auto-fix on this
 * preset's (and `recheck/microsoft`'s) swap pairs found real corruption of
 * genuinely correct prose spanning every category once assumed safe:
 * spelling (Hemingway's *A Moveable Feast* → "A Movable Feast"), hyphenation
 * ("read only the introduction" → "read-only the introduction"), and one
 * outright inverted meaning ("No SQL is used here" → "NoSQL is used here").
 * A rule's *category* does not predict fix-safety at this scale — a style
 * guide describes intent, `swap`/`consistency`/`pattern` match tokens, and
 * that gap is not closable by further narrowing which categories are
 * "safe." Detection is unaffected and is this preset's entire product:
 * every rule still runs `execute()` and reports; only `fix()` is gated off.
 * See `presets/google/PROVENANCE.md`'s "Detection-only" section for the
 * full corruption examples, and `preset-google.test.ts`'s preset-derived
 * "no rule is fixable" test for the permanent guarantee.
 *
 * The per-rule `fix: false` reasoning attached to individual rules below
 * remains accurate even though the blanket override above makes it
 * redundant in practice: it records which pairs are same-word
 * normalizations versus different-word substitutions, which is the
 * criterion that would matter again if this preset's auto-fix were ever
 * reconsidered. `fix: false` is set, rule by rule, on every entry whose
 * replacement is not deterministically safe: multiple valid alternatives,
 * context-dependent meaning, or a documented exception in the guide's own
 * text (e.g. `please` — the guide's own recommended example sentence uses
 * it). `pattern`-backed rules have no `fix()` at all (detection-only by
 * construction), so `fix` is only ever meaningful on `swap`/`capitalization`
 * rules here — all now moot under the blanket override above.
 *
 * WHAT ISN'T HERE, ON PURPOSE: this file does not attempt every one of the
 * ~380 checked candidates. Excluded categories (all recorded in
 * PROVENANCE.md's "Excluded candidates" section, each with a reason):
 * 6 fabrications caught during verification (a fictitious Flesch-
 * reading-ease threshold, three word-list entries that don't exist on the
 * live page, one wrong replacement value, one dropped word-list entry —
 * none of the six are anywhere in this file); every TOO-RISKY entry
 * (ordinary, highly polysemous words like `access`, `execute`, `impact`,
 * `each`, `possible`, `hit`, `type`, `option`, `above`/`below`, `native`,
 * `target`) where a blind string match would corrupt or flag large amounts
 * of unrelated, correct prose; every NOT-ENFORCEABLE entry (voice/tense
 * judgment calls, "introduce a table before it appears", "spell out an
 * abbreviation on first mention" — all require context Recheck's
 * regex/AST primitives cannot evaluate); the NOISY entries (already
 * over-broad on realistic prose); and a further, smaller set excluded
 * where the CONTENT is confirmed but a safe, low-false-positive detection
 * mechanism wasn't achievable with the assertions available (documented
 * individually, not silently dropped).
 *
 * SAME-WORD VS. DIFFERENT-WORD: a `swap` pair's per-rule `fix: false`
 * reasoning (see individual rules below) follows one mechanical criterion.
 * A pair is a same-word normalization — spelling, hyphenation, casing, or
 * non-standard form of one word — or it substitutes a different word or
 * phrase entirely: `agnostic` -> `platform-independent` (a real homograph:
 * "agnostic about the existence of an afterlife"), `GCP` -> `Google Cloud`
 * (an acronym expanding to a DIFFERENT phrase than its own letters, the
 * same shape as `recheck/microsoft`'s `DMZ`), `IO` -> `I/O` (collides with
 * "Socket.IO"). Only the former is safe to auto-fix; the latter carries
 * homograph/proper-noun risk regardless of how safe-looking the
 * replacement looks, so it ships detection-only. See PROVENANCE.md's
 * "Fix-posture" section for the complete rule-by-rule table.
 */

// -- link constants (one per distinct source page cited below) -----------
const HEADINGS = 'https://developers.google.com/style/headings';
const PERIODS = 'https://developers.google.com/style/periods';
const ACCESSIBILITY = 'https://developers.google.com/style/accessibility';
const LISTS = 'https://developers.google.com/style/lists';
const PERSON = 'https://developers.google.com/style/person';
const CONTRACTIONS = 'https://developers.google.com/style/contractions';
const WORD_LIST = 'https://developers.google.com/style/word-list';
const TIMELESS = 'https://developers.google.com/style/timeless-documentation';
const ABBREVIATIONS = 'https://developers.google.com/style/abbreviations';
const SLASHES = 'https://developers.google.com/style/slashes';
const NUMBERS = 'https://developers.google.com/style/numbers';
const DATES_TIMES = 'https://developers.google.com/style/dates-times';
const COMMAS = 'https://developers.google.com/style/commas';
const DASHES = 'https://developers.google.com/style/dashes';
const PRONOUNS = 'https://developers.google.com/style/pronouns';
const CROSS_REFERENCES = 'https://developers.google.com/style/cross-references';
const TEXT_FORMATTING = 'https://developers.google.com/style/text-formatting';
const CAPITALIZATION = 'https://developers.google.com/style/capitalization';
const CODE_IN_TEXT = 'https://developers.google.com/style/code-in-text';
const UI_ELEMENTS = 'https://developers.google.com/style/ui-elements';
const PROCEDURES = 'https://developers.google.com/style/procedures';
const INCLUSIVE_DOCUMENTATION = 'https://developers.google.com/style/inclusive-documentation';

// -- small builders, mirroring the shape of each ScopeRule/TokenRule's
// options (see rules/scope/*.ts and rules/token/*.ts) --------------------

function swapRule(opts: {
  pairs: Record<string, string>;
  message: string;
  link: string;
  scope?: string | string[];
  ignoreCase?: boolean;
  wordBoundary?: boolean;
  keysAreRegex?: boolean;
  fix?: false;
  severity?: 'warn' | 'error';
}): BaseRule {
  return {
    severity: opts.severity ?? 'warn',
    scope: opts.scope ?? 'summary',
    link: opts.link,
    message: opts.message,
    ...(opts.fix === false ? { fix: false as const } : {}),
    assertions: {
      swap: {
        pairs: opts.pairs,
        ignoreCase: opts.ignoreCase,
        wordBoundary: opts.wordBoundary,
        keysAreRegex: opts.keysAreRegex,
      },
    },
  };
}

function patternRule(opts: {
  tokens: string[];
  message: string;
  link: string;
  scope?: string | string[];
  ignoreCase?: boolean;
  includeCode?: boolean;
  severity?: 'warn' | 'error';
}): BaseRule {
  return {
    severity: opts.severity ?? 'warn',
    scope: opts.scope ?? 'summary',
    link: opts.link,
    message: opts.message,
    assertions: {
      pattern: {
        tokens: opts.tokens,
        ignoreCase: opts.ignoreCase,
        includeCode: opts.includeCode,
      },
    },
  };
}

function tokenRule(opts: {
  name: string;
  message: string;
  link: string;
  options?: Record<string, unknown>;
  severity?: 'warn' | 'error';
}): BaseRule {
  return {
    severity: opts.severity ?? 'error',
    link: opts.link,
    message: opts.message,
    assertions: { [opts.name]: opts.options ?? {} },
  };
}

export function buildGooglePreset(): RecheckConfig {
  const rules: RecheckConfig = {};

  // ======================================================================
  // STRUCTURAL — document mechanics Google states unambiguously (`error`).
  // ======================================================================

  // "Use sentence case for all headings and titles." (headings)
  // `fix: false`: an auto-fix would lowercase any proper noun not covered
  // by the built-in TECHNICAL_PROPER_NOUNS vocabulary or a user's own
  // `exceptions` — same reasoning as recheck/prose's identical rule.
  rules['google/heading-sentence-case'] = {
    severity: 'error',
    scope: 'heading',
    fix: false,
    link: HEADINGS,
    message: '"%s" should use %s capitalization (Google: sentence case for headings).',
    assertions: { capitalization: { match: '$sentence' } },
  };

  rules['google/heading-increment'] = tokenRule({
    name: 'heading-increment',
    message:
      'Heading levels should only increment by one level at a time (Google: heading structure).',
    link: HEADINGS,
  });

  rules['google/single-h1'] = tokenRule({
    name: 'single-h1',
    message: 'Only use a level-1 heading once on a page (Google: heading structure).',
    link: HEADINGS,
  });

  rules['google/first-line-h1'] = tokenRule({
    name: 'first-line-h1',
    message: 'The first line in a file should be a top-level heading (Google: heading structure).',
    link: HEADINGS,
  });

  rules['google/no-duplicate-heading'] = tokenRule({
    name: 'no-duplicate-heading',
    message:
      'Headings should be unique so readers can jump between sections (Google: heading structure).',
    link: HEADINGS,
  });

  rules['google/no-trailing-punctuation'] = tokenRule({
    name: 'no-trailing-punctuation',
    message: "Don't end headings with periods (Google).",
    link: PERIODS,
  });

  rules['google/no-empty-headings'] = tokenRule({
    name: 'no-empty-headings',
    message: "Don't use empty headings; make sure headings are followed by content (Google).",
    link: HEADINGS,
  });

  rules['google/no-emphasis-as-heading'] = tokenRule({
    name: 'no-emphasis-as-heading',
    message: 'Tag headings using heading elements, not bold/italic text (Google: accessibility).',
    link: ACCESSIBILITY,
  });

  // "Don't put links in headings." Raw markdown link syntax inside a
  // heading's own text is a reliable, low-false-positive signal.
  rules['google/no-link-in-heading'] = patternRule({
    tokens: ['\\[[^\\]]*\\]\\([^)]*\\)'],
    message: "Don't put links in headings (Google); move the link into the following paragraph.",
    link: HEADINGS,
    scope: 'heading',
    severity: 'error',
  });

  // "Start each list item with a capital letter." Same mechanism as the
  // heading rule above, scoped to list-item text instead.
  rules['google/list-item-capital'] = {
    severity: 'error',
    scope: 'list-item',
    fix: false,
    link: LISTS,
    message: '"%s" should use %s capitalization (Google: start list items with a capital letter).',
    assertions: { capitalization: { match: '$sentence' } },
  };

  rules['google/no-alt-text'] = tokenRule({
    name: 'no-alt-text',
    message: 'Every image needs alt text (Google: accessibility).',
    link: ACCESSIBILITY,
  });

  // "Don't merge cells. Don't use colspan or rowspan attributes." GFM
  // tables have no native merged-cell syntax, so this only ever fires on
  // raw HTML tables embedded in the markdown — scope: 'all' so it can see
  // that raw HTML.
  // Also confirmed on the tables page (TABLES); ACCESSIBILITY is the
  // primary citation (see PROVENANCE.md for both).
  rules['google/no-merged-cells'] = patternRule({
    tokens: ['\\bcolspan\\s*=', '\\browspan\\s*='],
    message: "Don't merge table cells with colspan/rowspan (Google).",
    link: ACCESSIBILITY,
    scope: 'all',
    ignoreCase: true,
    severity: 'error',
  });

  // "Try to use fewer than 26 words per sentence." (accessibility) — the
  // one Google number spec §5.6 maps onto the new `length` assertion
  // (`unit: words`, `scope: sentence`, `max: 25`), the same way Microsoft's
  // 150-character alt-text limit uses it. This is the first non-prose
  // preset to ship a `length`-backed rule — see presets.test.ts's
  // generalized "shipped in any preset vs documented opt-in" accounting.
  rules['google/sentence-length'] = {
    severity: 'error',
    scope: 'sentence',
    link: ACCESSIBILITY,
    message: 'Sentence is %s %s long; Google recommends fewer than 26 words (max %s).',
    assertions: { length: { unit: 'words', max: 25 } },
  };

  // ======================================================================
  // HEADINGS (residual) / LISTS — `warn`.
  // ======================================================================

  // "Avoid code items in headings." `includeCode: true` because the whole
  // point is to catch the code span itself.
  rules['google/no-code-in-heading'] = patternRule({
    tokens: ['`[^`]+`'],
    message: 'Avoid code items in headings (Google); rephrase in plain words.',
    link: HEADINGS,
    scope: 'heading',
    includeCode: true,
  });

  // "Don't use numbers in headings to indicate a sequence." Narrowly
  // scoped to step/part-style sequence markers and bare leading ordinals
  // to keep the false-positive rate low (see PROVENANCE.md).
  rules['google/no-numbered-headings'] = patternRule({
    tokens: ['^\\d+[.)]\\s', '^Step\\s+\\d+\\b', '^Part\\s+\\d+\\b'],
    message: "Don't use numbers in headings to indicate a sequence (Google).",
    link: HEADINGS,
    scope: 'heading',
    ignoreCase: true,
  });

  // "[A single item] isn't really a list" (confirmed principle) —
  // operationalized via list-length's own `min: 2` default, with no `max`
  // (Google states no upper bound; that's Microsoft's stated 2-7 range,
  // spec §5.6). Downgraded from the generic "list mechanics -> error"
  // severity example to `warn`: the verifier marked the underlying guide
  // statement NOT-ENFORCEABLE (a descriptive aside, not an imperative
  // "must have >= 2 items"), so only the MECHANISM is deterministic here,
  // not the guide's own confidence in it as a hard rule.
  rules['google/list-length'] = tokenRule({
    name: 'list-length',
    message:
      'List has %s item(s); a single item usually reads better as a plain sentence (Google).',
    link: LISTS,
    options: { min: 2 },
    severity: 'warn',
  });

  // ======================================================================
  // VOICE / PERSON / TENSE / CONTRACTIONS — `warn`.
  // ======================================================================

  // "Use you or your instead of we, our, or us" — except to refer to the
  // authoring organization itself, which the guide explicitly allows.
  // Detection-only: a bare pronoun swap can't reliably rewrite the
  // surrounding sentence, and the organizational exception makes a blind
  // fix wrong some of the time anyway.
  // A bare `ignoreCase: true` would catch a sentence-initial "We" but also
  // matches the all-caps abbreviation "US" -- the EXACT form
  // `google/us-abbreviation` (below) fixes toward, producing a permanent,
  // unfixable warning here with a nonsense "use second person" message
  // about a country abbreviation. Enumerating the specific casings that
  // are actually the pronoun ("we"/"We"/"our"/"Our"/"us"/"Us") instead of
  // relying on `ignoreCase` still catches sentence-initial capitalization
  // without also matching all-caps "US".
  rules['google/second-person'] = patternRule({
    tokens: ['\\b(?:We|we|Our|our|Us|us)\\b'],
    message:
      'Use second person ("you"/"your") instead of "%s", unless referring to the organization itself (Google).',
    link: PERSON,
  });

  // "We recommend using negation contractions such as isn't, don't, and
  // can't." `fix: false`: the guide's own emphasis exception ("is *not*")
  // means a blind contraction isn't always right.
  rules['google/use-contractions'] = swapRule({
    pairs: {
      'is not': "isn't",
      'are not': "aren't",
      'do not': "don't",
      'does not': "doesn't",
      'did not': "didn't",
      cannot: "can't",
      'will not': "won't",
      'have not': "haven't",
      'has not': "hasn't",
      'had not': "hadn't",
      'should not': "shouldn't",
      'would not': "wouldn't",
      'could not': "couldn't",
    },
    message: 'Use "%s" instead of "%s" (Google recommends negation contractions).',
    link: CONTRACTIONS,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/no-triple-contractions'] = patternRule({
    tokens: ["\\bmightn't've\\b", "\\bwouldn't've\\b", "\\bcouldn't've\\b", "\\bshouldn't've\\b"],
    message: 'Don\'t use three-word contractions such as "%s" (Google).',
    link: CONTRACTIONS,
    ignoreCase: true,
  });

  rules['google/no-lets'] = patternRule({
    tokens: ["\\blet's\\b"],
    message: '"%s": avoid if at all possible (Google).',
    link: `${WORD_LIST}#lets`,
    ignoreCase: true,
  });

  // "Don't use the phrase please note." Detection-only: deleting "please
  // note" from a sentence leaves a capitalization/fragment mess behind
  // ("Please note that the endpoint is deprecated." -> "that the endpoint
  // is deprecated.") since a swap can't also re-capitalize or restructure
  // the rest of the sentence.
  rules['google/no-please-note'] = swapRule({
    pairs: { 'please note': '' },
    message: '%sGoogle\'s style guide says not to use the phrase "%s"; remove it.',
    link: `${WORD_LIST}#please`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // Bare "please" must stay DETECT-ONLY: the guide's own recommended
  // example sentence uses it ("If the issue persists, please contact your
  // account representative"), so a delete-swap would rewrite text the
  // guide itself endorses.
  rules['google/no-please'] = patternRule({
    tokens: ['\\bplease\\b'],
    message:
      '"%s": only use when asking for permission or forgiveness, not in the normal course of instructions (Google).',
    link: `${WORD_LIST}#please`,
    ignoreCase: true,
  });

  // ======================================================================
  // TIMELESS DOCUMENTATION — `warn`.
  // ======================================================================

  // The confirmed 15-term avoid-list (word-list + timeless-documentation)
  // includes several ordinary high-frequency words (`currently` aside,
  // `existing`, `future`, `latest`, `new`, `newer`, `now`, `old`, `older`,
  // `soon`, `eventually`, `in the future`) whose everyday, unrelated uses
  // would make a blind pattern unusably noisy on realistic prose. Shipped
  // here is the distinctive subset with low collateral-match risk; the
  // rest is in PROVENANCE.md's excluded list with this same reasoning.
  rules['google/no-timeless-phrases'] = patternRule({
    tokens: [
      '\\bas of this writing\\b',
      '\\bat present\\b',
      '\\bpresently\\b',
      '\\bdoes not yet\\b',
      '\\bcurrently\\b',
    ],
    message:
      '"%s" is implied by the existence of the documentation itself; consider removing it (Google).',
    link: TIMELESS,
    ignoreCase: true,
  });

  // ======================================================================
  // LATINISMS / ABBREVIATIONS / SLANG — `warn`.
  // ======================================================================

  // `wordBoundary: false` is required: a trailing `\b` right after a
  // period-then-space never matches (both are non-word characters -- see
  // swap.ts's word-boundary construction), which would otherwise break the
  // common "i.e. " case. But dropping anchoring entirely lets a key match
  // as a bare substring: the un-anchored `vs.` matches inside "revs." ("The
  // counter revs. up quickly." -> "The counter reversus up quickly."). A
  // LEADING `\b` baked directly into each regex source via `keysAreRegex`
  // fixes this: a match can still only start at a real word boundary --
  // "revs." doesn't match because there's no boundary between "re" and
  // "vs.". No trailing `\b` is added, so the anchoring is intentionally
  // asymmetric (leading-only).
  //
  // `i.e.`/`e.g.` -> `that is`/`for example` are multi-word replacements, so
  // an ALL-CAPS input (`I.E.`, `E.G.`) would otherwise get
  // `applyMatchCase`-shouted into `"THAT IS"`/`"FOR EXAMPLE"`. `vs.` ->
  // `versus` is a single-word replacement, so it was never affected by that
  // shouting behavior (an ALL-CAPS `VS.` becomes all-caps `VERSUS` --
  // unchanged, and correct: see case-preserve.ts's doc comment on why
  // single-word stays as-is). The multi-word case is handled at the engine
  // (`applyMatchCase`), not here -- every pair in this preset shares the one
  // helper, so a per-rule `fix: false` would only hide the same defect
  // again elsewhere.
  //
  // Split: `i.e.`/`e.g.` are Latin abbreviations translated into a
  // DIFFERENT English phrase, not a respelling of the same word (contrast
  // `vs.` -> `versus` below, which shares its own letters with the word it
  // abbreviates). Detection-only.
  rules['google/no-latinisms'] = swapRule({
    pairs: {
      '\\bi\\.e\\.': 'that is',
      '\\be\\.g\\.': 'for example',
    },
    message: 'Use "%s" instead of "%s" (Google).',
    link: WORD_LIST,
    fix: false,
    ignoreCase: true,
    wordBoundary: false,
    keysAreRegex: true,
  });

  // `vs.` -> `versus` is a same-word abbreviation (the letters of "vs."
  // literally truncate "versus"), unlike `i.e.`/`e.g.` above -- stays
  // fixable.
  rules['google/vs-versus'] = swapRule({
    pairs: {
      '\\bvs\\.': 'versus',
    },
    message: 'Use "%s" instead of "%s" (Google).',
    link: WORD_LIST,
    ignoreCase: true,
    wordBoundary: false,
    keysAreRegex: true,
  });

  // `aka` and `vice versa` don't end in a period, so neither needs the
  // leading-only exemption above -- both get full `\b...\b` anchoring.
  // Without it, "aka" matches inside ordinary words containing that
  // substring ("Akamai" -> "Also known asmai", "Osaka" -> "Osalso known
  // as"). Full anchoring fixes both: there's no word boundary between "Os"
  // and "aka" in "Osaka", and no word boundary between "Aka" and "mai" in
  // "Akamai", so neither matches anymore.
  //
  // Both replacements here are multi-word (`also known as`, `the other way
  // around`), so an ALL-CAPS input (`AKA`, `VICE VERSA`) would otherwise get
  // shouted into `"ALSO KNOWN AS"`/`"THE OTHER WAY AROUND"` -- handled at
  // the engine (`applyMatchCase`), the same fix as `no-latinisms` above.
  //
  // Split: `vice versa` -> `the other way around` substitutes a different
  // phrase entirely (no letter-derived relationship, unlike `aka`).
  // Detection-only.
  rules['google/no-latinisms-plain'] = swapRule({
    pairs: {
      'vice versa': 'the other way around',
    },
    message: 'Use "%s" instead of "%s" (Google).',
    link: WORD_LIST,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // `aka` -> `also known as` is an ABBREVIATION EXPANDED INTO A PHRASE, not
  // a respelling of the same word -- the same shape as `e.g.`/`i.e.` above
  // (detection-only) and `spec` -> `specification`
  // (`microsoft/az-abbreviations-substitutions`), not the same shape as
  // `vs.` -> `versus` (a literal truncation sharing the target word's own
  // letters). That the letters of "aka" spell out the words of "also known
  // as" does not make expanding an abbreviation into a phrase a same-word
  // normalization; it's a substitution, like every other
  // Latin-abbreviation-to-phrase pair in this file.
  rules['google/aka-form'] = swapRule({
    pairs: {
      aka: 'also known as',
    },
    message: 'Use "%s" instead of "%s" (Google).',
    link: WORD_LIST,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // `fix: false`: each of these needs a real fixed alternative, but not
  // every grammatical slot in a sentence takes it cleanly.
  rules['google/no-internet-slang'] = swapRule({
    pairs: {
      'tl;dr': 'To summarize',
      ymmv: 'Your results might vary',
      RTFM: 'For more information, see...',
    },
    message: 'Avoid the internet-slang abbreviation "%s"; use "%s" instead (Google).',
    link: ABBREVIATIONS,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // "Don't use [via]." No replacement is given — detection-only.
  rules['google/no-via'] = patternRule({
    tokens: ['\\bvia\\b'],
    message:
      '"%s": avoid — Google\'s word list says not to use it; rephrase (e.g. "using", "through").',
    link: `${WORD_LIST}#via`,
    ignoreCase: true,
  });

  rules['google/abbrev-no-periods'] = patternRule({
    tokens: ['\\b(?:[A-Z]\\.){2,}'],
    message: 'Don\'t use periods with acronyms or initialisms such as "%s" (Google).',
    link: ABBREVIATIONS,
  });

  // `fix: false`: "U.S." is part of many real organizations' own official
  // names -- "U.S. Bank" (a top-10 US bank), "U.S. Steel", "U.S. Robotics"
  // -- so normalizing it silently corrupts the org's own name ("processed
  // by U.S. Bank" -> "processed by US Bank"). Same shape as
  // `microsoft/usa-abbreviation`.
  rules['google/us-abbreviation'] = swapRule({
    pairs: { 'U.S.A.': 'US', 'U.S.': 'US' },
    message: 'Use "%s" instead of "%s" (Google: US is OK as an abbreviation for United States).',
    link: `${WORD_LIST}#US`,
    fix: false,
    wordBoundary: false,
  });

  // Both keys end in a non-word character ("o"/"/"... `w/` itself ends in
  // "/"), so a naive full `\b...\b` would fail the extremely common "w/
  // headers" case (a trailing boundary right after "/" followed by a
  // space -- both non-word -- never matches), which is why this rule needs
  // `wordBoundary: false`. But with NO anchoring at all, `w/` also matches
  // inside "www/static", "show/hide", "new/old", and `c/o` matches inside
  // "src/output" (each rewritten into corrupted nonsense). A leading-only
  // `\b` (baked into the regex source via `keysAreRegex`, same technique
  // as `no-latinisms` above) fixes it: there is no word boundary between
  // "sr" and "c/o" in "src/output", or between the second "w" and "w/" in
  // "www/static", so neither matches anymore, while "Send documents c/o
  // the compliance department." and "Serve files w/ the config" still
  // match correctly (preceded by whitespace).
  //
  // The leading-only `\b` alone still leaves the trailing side open: `w/o`
  // is a common, ordinary English abbreviation for "without", not a
  // curiosity, and it still matches the bare `w/` key (immediately
  // followed by the word character "o", with no trailing boundary
  // required) -- "w/o downtime" -> "witho downtime". Same shape for `c/o`
  // immediately followed by a word character -- "c/oscillator" ->
  // "care ofscillator". A trailing negative lookahead blocking a following
  // ASCII letter (`(?![A-Za-z])`) closes this without reintroducing the
  // `wordBoundary: true` failure: "w/ headers" and "c/o the compliance
  // department" both still match (the character right after the slash/the
  // "o" is whitespace, not a letter), while "w/o downtime" and
  // "c/oscillator" no longer do. The guide's own `slashes` page lists only
  // "c/o" and "w/" as the abbreviations to avoid (see PROVENANCE.md's
  // quote for this rule) -- "w/o" isn't a separate documented entry, so
  // leaving it alone entirely (not reported either) is the correct
  // outcome, not a gap.
  //
  // `c/o` -> `care of` is a multi-word replacement matched by an
  // `ignoreCase: true` rule, so an ALL-CAPS `C/O` would otherwise get
  // `applyMatchCase`-shouted into `"CARE OF"` -- fixed at the engine, not
  // here.
  rules['google/no-slash-abbrev'] = swapRule({
    pairs: { '\\bc/o(?![A-Za-z])': 'care of', '\\bw/(?![A-Za-z])': 'with' },
    message: 'Use "%s" instead of the slash abbreviation "%s" (Google).',
    link: SLASHES,
    ignoreCase: true,
    wordBoundary: false,
    keysAreRegex: true,
  });

  // ======================================================================
  // NUMBERS / DATES / UNITS — `warn`.
  // ======================================================================

  rules['google/spell-out-ordinals'] = patternRule({
    tokens: ['\\b\\d+(?:st|nd|rd|th)\\b'],
    message: 'Spell out ordinal numbers; avoid "%s" (Google).',
    link: NUMBERS,
  });

  // Three tokens are confirmed on the numbers page (NUMBERS); the fourth
  // (a hyphen range introduced by "from") is confirmed on the SEPARATE
  // hyphens page (developers.google.com/style/hyphens) -- see
  // PROVENANCE.md for both citations; `link:` carries the primary one.
  rules['google/number-format'] = patternRule({
    tokens: [
      '\\d\\s%', // no space before the percent sign
      '(?<![\\d.])\\.\\d', // decimals under 1 need a leading zero
      '\\d+ x \\d+', // dimensions: lowercase x, no surrounding spaces
      '\\bfrom\\s+\\d+-\\d+\\b', // a hyphen range introduced by "from"
    ],
    message: 'Number formatting: "%s" doesn\'t match Google\'s stated convention.',
    link: NUMBERS,
  });

  rules['google/date-format'] = patternRule({
    tokens: ['\\b\\d{1,2}/\\d{1,2}/\\d{2,4}\\b'],
    message: 'Avoid all-numeric slash dates such as "%s" (Google); spell out the month.',
    link: DATES_TIMES,
  });

  // "Remove the minutes from round hours" is on DATES_TIMES; the AM/PM
  // capitalization/spacing rule is on the word-list page's `AM, PM` entry
  // (see PROVENANCE.md for both citations).
  rules['google/time-format'] = patternRule({
    tokens: [
      '\\d\\s?[ap]\\.m\\.', // lowercase, dotted a.m./p.m.
      '\\d(?:am|pm)\\b', // lowercase, no space, no periods
      '\\d(?:AM|PM)\\b', // missing the required space before AM/PM
      '\\b\\d{1,2}:00\\s?(?:AM|PM|am|pm)\\b', // round hour should drop :00
    ],
    message:
      '"%s": use all-caps AM/PM with a space before it, and drop :00 on round hours (Google).',
    link: `${WORD_LIST}#AM,_PM`,
  });

  rules['google/rfc-spacing'] = patternRule({
    tokens: ['\\bRFC\\d+\\b'],
    message: 'Use a space between RFC and the number, e.g. "RFC 2318" (Google): "%s"',
    link: `${WORD_LIST}#RFC`,
  });

  rules['google/data-rate-units'] = swapRule({
    pairs: {
      'KB/s': 'KBps',
      'Kb/s': 'Kbps',
      'MB/s': 'MBps',
      'Mb/s': 'Mbps',
      'GB/s': 'GBps',
      'Gb/s': 'Gbps',
    },
    message: 'Use "%s" instead of "%s" (Google: by convention we don\'t use the slash form).',
    link: `${WORD_LIST}#GBps`,
    wordBoundary: true,
  });

  // ======================================================================
  // PUNCTUATION — `warn`.
  // ======================================================================

  // "Don't use ampersands (&) as conjunctions or shorthand for and."
  // Restricted to an ampersand with a space on both sides (i.e. used as a
  // standalone word), so HTML entities (`&amp;`) and brand names (`AT&T`)
  // are left alone.
  rules['google/no-ampersand'] = patternRule({
    tokens: ['\\s&\\s'],
    message: 'Don\'t use "&" as a conjunction or shorthand for "and" (Google).',
    link: TEXT_FORMATTING,
  });

  // En dashes, double hyphens, and a spaced em dash all get flagged; a
  // Google-style em dash has no surrounding spaces.
  rules['google/dash-style'] = patternRule({
    tokens: ['\u2013', '\\s--\\s', '\\s\u2014\\s'],
    message:
      "Don't use an en dash or a double hyphen in place of an em dash; don't space the em dash (Google).",
    link: DASHES,
  });

  rules['google/single-space-sentences'] = patternRule({
    tokens: ['\\.  +\\S'],
    message: 'Leave only one space between sentences (Google).',
    link: PERIODS,
  });

  // "Put a comma after the conjunctive adverb" (otherwise/however/
  // therefore) when it opens a sentence.
  rules['google/conjunctive-adverb-comma'] = patternRule({
    tokens: ['^(?:Otherwise|However|Therefore) [a-z]'],
    message: 'Put a comma after "%s" when it opens a sentence (Google).',
    link: COMMAS,
    scope: 'sentence',
  });

  // "That introduces a restrictive clause. It isn't preceded by a comma."
  rules['google/comma-before-that'] = patternRule({
    tokens: [', that\\b'],
    message: 'Don\'t put a comma before restrictive "that" (Google).',
    link: PRONOUNS,
    scope: 'sentence',
  });

  rules['google/neither-nor'] = patternRule({
    tokens: ['\\bneither\\b(?:(?!\\bnor\\b)[\\s\\S])*?\\bor\\b'],
    message: 'Write "neither A nor B", not "neither A or B" (Google).',
    link: `${WORD_LIST}#neither`,
    scope: 'sentence',
  });

  rules['google/no-and-or'] = patternRule({
    tokens: ['\\band/or\\b'],
    message: 'Avoid "and/or" except where space is limited, such as in tables (Google).',
    link: SLASHES,
    ignoreCase: true,
  });

  // ======================================================================
  // LINKS — `warn` unless noted.
  // ======================================================================

  rules['google/vague-link-text'] = patternRule({
    tokens: ['\\b(?:this document|this article|this page|this topic|this doc|click here)\\b'],
    message: 'Avoid vague link text such as "%s"; describe the destination (Google).',
    link: CROSS_REFERENCES,
    scope: 'link',
    ignoreCase: true,
  });

  rules['google/no-url-as-link-text'] = patternRule({
    tokens: ['^https?://'],
    message: "Don't use a URL as link text (Google); use a descriptive phrase instead.",
    link: CROSS_REFERENCES,
    scope: 'link',
  });

  // Swaps a different preposition ("on" -> "about"), not a respelling of
  // the same word -- detection-only.
  rules['google/link-intro-about'] = swapRule({
    pairs: {
      'for more information on': 'for more information about',
      'more details on': 'more details about',
    },
    message: 'Use "%s" instead of "%s" (Google: use "about", not "on").',
    link: CROSS_REFERENCES,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['google/link-punctuation'] = patternRule({
    tokens: ['^["\u201c].*["\u201d]$'],
    message: "Don't put link text in quotation marks (Google).",
    link: CROSS_REFERENCES,
    scope: 'link',
  });

  rules['google/no-target-blank'] = patternRule({
    tokens: ['target\\s*=\\s*["\']_blank["\']'],
    message: "Don't force links to open in a new tab or window (Google).",
    link: CROSS_REFERENCES,
    scope: 'all',
  });

  // "Use this document, and not this article, this topic, this doc"
  // (word-list #documentation) -- a general terminology preference for
  // referring to the current document, independent of link text (that's
  // the LINK-scoped rule above).
  rules['google/self-reference-terms'] = patternRule({
    tokens: ['\\bthis article\\b', '\\bthis topic\\b', '\\bthis doc\\b', '\\bthis page\\b'],
    message: 'Use "this document" instead of "%s" when referring to the current document (Google).',
    link: `${WORD_LIST}#documentation`,
    ignoreCase: true,
  });

  // ======================================================================
  // TEXT FORMATTING — `warn`.
  // ======================================================================

  // "It's best to use the double asterisk for bold" / "we recommend
  // underscores" (for emphasis) -- two separate token rules, each with its
  // own single-markup-style option.
  rules['google/emphasis-style'] = {
    severity: 'warn',
    link: TEXT_FORMATTING,
    message: 'Use underscores for emphasis/italics, not asterisks (Google).',
    assertions: { 'emphasis-style': { style: 'underscore' } },
  };

  rules['google/strong-style'] = {
    severity: 'warn',
    link: TEXT_FORMATTING,
    message: 'Use double asterisks for bold, not underscores (Google).',
    assertions: { 'strong-style': { style: 'asterisk' } },
  };

  rules['google/no-underline'] = patternRule({
    tokens: ['<u>'],
    message: 'Reserve underlining for link text (Google).',
    link: TEXT_FORMATTING,
    scope: 'all',
    ignoreCase: true,
  });

  rules['google/no-casing-style-names'] = patternRule({
    tokens: ['\\bcamel[\\s-]?case\\b', '\\bsnake[\\s-]?case\\b'],
    message:
      'Don\'t use a casing style name such as "%s"; describe the naming convention instead (Google).',
    link: CAPITALIZATION,
    ignoreCase: true,
  });

  // ======================================================================
  // CODE IN TEXT — `warn`.
  // ======================================================================

  // "Don't inflect the name of a code element." `includeCode: true`
  // because the match deliberately spans the closing backtick.
  rules['google/no-inflected-code'] = patternRule({
    tokens: ["`[^`]+`'s\\b", '`[^`]+`s\\b'],
    message: 'Don\'t inflect the name of a code element (Google): "%s"',
    link: CODE_IN_TEXT,
    includeCode: true,
  });

  // ======================================================================
  // UI ELEMENTS / VERBS — `warn`.
  // ======================================================================

  rules['google/ui-element-quotes'] = patternRule({
    tokens: ['"[A-Z][a-zA-Z ]*"\\s+(?:button|tab|menu|checkbox|option|link|field)\\b'],
    message: 'Don\'t put UI element names in quotation marks; use bold instead (Google): "%s"',
    link: UI_ELEMENTS,
  });

  // Drops a word rather than respelling one -- a different phrase, not a
  // same-word normalization. Detection-only.
  rules['google/no-click-on'] = swapRule({
    pairs: { 'click on': 'click' },
    message: 'Use "%s" instead of "%s" (Google).',
    link: `${WORD_LIST}#click`,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "hover: Don't use. Instead use hold the pointer over." Detection-only
  // (not a swap): "hover"/"hovers"/"hovering" don't all slot into "hold
  // the pointer over" the same way.
  rules['google/no-hover'] = patternRule({
    tokens: ['\\bhover(?:s|ing|ed)?\\b'],
    message: 'Use "hold the pointer over" instead of "%s" (Google).',
    link: `${WORD_LIST}#hover`,
    ignoreCase: true,
  });

  // "uncheck: ... use clear for checkboxes." Bare "check" is too
  // polysemous to swap blindly (checking logs, checking that X is true),
  // and "deselect" is Google's OWN correct term for non-checkbox UI
  // elements, so it is deliberately NOT included here (see PROVENANCE.md).
  // Different-word substitution, not a respelling -- detection-only.
  rules['google/no-uncheck'] = swapRule({
    pairs: { uncheck: 'clear' },
    message: 'Use "%s" instead of "%s" for checkboxes (Google).',
    link: `${WORD_LIST}#uncheck`,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['google/scroll-to'] = swapRule({
    pairs: { 'scroll to': 'go to' },
    message: 'Prefer "%s" over "%s" (Google).',
    link: `${WORD_LIST}#scroll`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // "Don't use the word toggle as a verb. Describe the action." Scoped to
  // verb-like usage ("toggle the setting", "to toggle") so the legitimate
  // noun ("a toggle switch") isn't flagged.
  rules['google/no-toggle-verb'] = patternRule({
    tokens: ['\\btoggle(?:d|s)?\\s+(?:the|this|that|a|an)\\b', '\\bto toggle\\b'],
    message: 'Describe the action instead of using "toggle" as a verb (Google): "%s"',
    link: UI_ELEMENTS,
    ignoreCase: true,
  });

  rules['google/keyboard-keys'] = patternRule({
    tokens: ['\\bctrl\\b', '\\bcmd\\b', '\u2318'],
    message: 'Spell out modifier keys (Control, Command) instead of "%s" (Google).',
    link: UI_ELEMENTS,
    ignoreCase: true,
  });

  // "chapter: Instead, refer to documents, pages, or sections."
  // Detection-only: the right replacement depends on what's being referred to.
  rules['google/chapter-terminology'] = patternRule({
    tokens: ['\\bchapters?\\b'],
    message: 'Refer to "document", "page", or "section" instead of "%s" (Google, for web docs).',
    link: `${WORD_LIST}#chapter`,
    ignoreCase: true,
  });

  // ======================================================================
  // PLAIN LANGUAGE / WORDINESS — `warn`.
  // ======================================================================

  // Every pair is a different-word substitution, not a respelling.
  // `agnostic` -> `platform-independent` is a real homograph: "agnostic"
  // very commonly means "doubting/noncommittal about religious or
  // philosophical claims" ("he's agnostic about the existence of an
  // afterlife"), a sense this pair would corrupt into "platform-independent
  // about the existence of an afterlife". Detection-only.
  rules['google/plain-language-swaps'] = swapRule({
    pairs: {
      'allows you to': 'lets you',
      'enables you to': 'lets you',
      comprise: 'consist of',
      'comprised of': 'consist of',
      desire: 'want',
      desired: 'wanted',
      wish: 'want',
      learnings: 'knowledge',
      agnostic: 'platform-independent',
    },
    message: 'Prefer "%s" over "%s" (Google: plain language).',
    link: WORD_LIST,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "Avoid in order to; instead, use to. Use in order to when needed to
  // clarify meaning." Not absolute -- `fix: false`.
  rules['google/in-order-to'] = swapRule({
    pairs: { 'in order to': 'to' },
    message: 'Prefer "%s" over "%s" unless needed to clarify meaning (Google).',
    link: `${WORD_LIST}#in_order_to`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // "Use with caution. Don't use utilize when you mean use. It's OK to use
  // utilize... when referring to the quantity of a resource being used."
  // Detection-only given that documented exception.
  rules['google/utilize'] = patternRule({
    tokens: ['\\butiliz(?:e|es|ed|ing|ation)\\b'],
    message:
      'Use "use" instead of "%s" unless referring to the quantity of a resource used (Google).',
    link: `${WORD_LIST}#utilize`,
    ignoreCase: true,
  });

  rules['google/leverage'] = swapRule({
    pairs: { leverage: 'use', leveraging: 'using', leveraged: 'used' },
    message: 'Avoid "%s" if you mean "use", "build on", or "take advantage of" (Google): "%s"',
    link: `${WORD_LIST}#leverage`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // "Avoid where possible. Instead, use a more precise term." No fixed
  // replacement is given -- detection-only.
  rules['google/performant'] = patternRule({
    tokens: ['\\bperformant\\b'],
    message: 'Avoid "%s"; use a more precise term (Google).',
    link: `${WORD_LIST}#performant`,
    ignoreCase: true,
  });

  rules['google/copy-and-paste'] = patternRule({
    tokens: ['\\bcopy and paste\\b'],
    message: 'Explain what to enter into a field, not how to enter it (Google): "%s"',
    link: `${WORD_LIST}#Copy_and_paste`,
    ignoreCase: true,
  });

  // "Avoid using [Create a new ...] unless you need to distinguish the
  // item from another recently created item." `fix: false` for that
  // documented exception.
  rules['google/create-a-new'] = swapRule({
    pairs: { 'Create a new': 'Create a' },
    message:
      'Use "%s ..." instead of "%s ..." unless distinguishing from another recently created item (Google).',
    link: `${WORD_LIST}#Create_a_new`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/no-run-the-following-command'] = patternRule({
    tokens: ['\\brun the following command\\b'],
    message: 'Focus on what the command does instead of "%s" (Google).',
    link: PROCEDURES,
    ignoreCase: true,
  });

  // Phrase expansion, not a respelling -- detection-only.
  rules['google/cons-and-pros'] = swapRule({
    pairs: { 'pros and cons': 'advantages and disadvantages' },
    message: 'Use "%s" instead of "%s" (Google).',
    link: `${WORD_LIST}#pros`,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // ======================================================================
  // PRODUCT / BRAND NAMES — `warn`.
  // ======================================================================

  // `'API Console': 'Google Cloud console'` is deliberately not a pair
  // here: the guide's own text offers "Google APIs Explorer **or** the
  // Google Cloud console" by context (which one depends on what the API
  // Console reference actually meant), so a single fixed replacement
  // doesn't map cleanly; see PROVENANCE.md's excluded-candidates list.
  //
  // `'Cloud console': 'Google Cloud console'` is a literal SUBSTRING of its
  // own replacement, so fixing it once produces text the SAME pair matches
  // again -- "Cloud console" -> "Google Cloud console" -> "Google Google
  // Cloud console" -> ... , compounding a "Google " prefix every pass, the
  // same self-compounding shape as the OAuth-2.0.0.0 case below.
  // `keysAreRegex: true` lets this one key carry a negative lookbehind
  // excluding a match already preceded by "Google " (every OTHER key here
  // is plain text with no regex metacharacters, so this doesn't change
  // their matching at all). This also fixes 'Developers Console' ->
  // 'Google Cloud console', which would otherwise feed the same bug on its
  // own output every pass.
  //
  // That lookbehind, `(?<!Google )`, is an EXACT, case-sensitive,
  // single-space literal. It only blocks the one casing "Google "
  // immediately before "Cloud console" -- the self-compounding bug it's
  // meant to eliminate is still reachable through any other spelling of
  // the same word: "google Cloud console" -> "google Google Cloud
  // console", "GOOGLE Cloud console" -> "GOOGLE Google Cloud console", or
  // "Google  Cloud console" (double space) -> "Google Google  Cloud
  // console". This whole rule has no `ignoreCase` (several OTHER keys
  // here, e.g. `'API explorer'` vs `'API Explorer'`, are deliberately
  // case-distinct), so the fix is scoped to just this key's own lookbehind
  // rather than the rule-wide flag: a character class per letter
  // (`[Gg][Oo][Oo][Gg][Ll][Ee]`) matches any casing of "google" without
  // touching the rule's case-sensitivity elsewhere, and `\s+` (JS
  // lookbehind supports variable-length patterns) tolerates any run of
  // whitespace, not just a single space. Verified against all four
  // spellings (`Google `, `google `, `GOOGLE `, `Google  ` double-spaced)
  // producing no further match, plus the bare `'Cloud console'` (no
  // preceding "google" in any form) still matching and getting corrected.
  // Every remaining pair here is a brand/terminology rename to a DIFFERENT
  // word or phrase (not a respelling) -- e.g. `account name` -> `username`
  // and `MIME type` -> `media type` are both ordinary technical terms with
  // plausible unrelated uses outside Google's own product surface, the same
  // homograph-risk shape as the rest of this file's detection-only pairs.
  // Detection-only. `cURL` -> `curl` lives in `google/brand-capitalization`
  // below instead -- it's a pure casing correction of the identical tool
  // name, not a substitution.
  rules['google/product-names'] = swapRule({
    pairs: {
      'Cloud Platform': 'Google Cloud',
      '(?<![Gg][Oo][Oo][Gg][Ll][Ee]\\s+)Cloud console': 'Google Cloud console',
      'Developers Console': 'Google Cloud console',
      'Google Cloud SDK': 'Cloud SDK',
      'API explorer': 'APIs Explorer',
      'API Explorer': 'APIs Explorer',
      'developer key': 'API key',
      'dev key': 'API key',
      'API Console key': 'API key',
      'account name': 'username',
      'curated roles': 'predefined roles',
      'network IP address': 'internal IP address',
      'MIME type': 'media type',
      'interconnect type': 'connection type',
      'peer zone': 'peering zone',
      'Android device': 'Android-powered device',
      'Android devices': 'Android-powered devices',
    },
    message: 'Use "%s" instead of "%s" (Google product naming).',
    link: WORD_LIST,
    fix: false,
    wordBoundary: true,
    keysAreRegex: true,
  });

  // A naive `applyMatchCase` would upper-case an ALL-CAPS replacement's
  // ENTIRETY whenever the matched text is itself ALL-CAPS -- correct for a
  // same-word casing fix, but "GCP" is a 3-letter acronym expanding to the
  // two-word phrase "Google Cloud", so preserving its all-caps shape would
  // produce "GOOGLE CLOUD" instead: `--fix` would silently SHOUT the text
  // it's supposed to make normal (the same failure mode as the
  // `Microservices`/`UNICODE`/`IPSEC` cases elsewhere in this file).
  // `applyMatchCase` is fixed at the source (`src/core/case-preserve.ts`)
  // instead of per-rule: an ALL-CAPS match no longer forces a MULTI-WORD
  // replacement to upper-case; it's inserted as authored.
  // `applyMatchCase('GCP', 'Google Cloud')` returns `'Google Cloud'`
  // (correctly cased, matching the configured replacement exactly) rather
  // than `'GOOGLE CLOUD'`. Unlike `UNICODE`/`IPSEC` below (which stay
  // `fix: false` -- see `google/acronym-caps-detect-only`), "GCP" ->
  // "Google Cloud" is a genuine multi-word expansion, so it's the exact
  // case the engine fix targets, and the result is idempotent (the fixed
  // text "Google Cloud" no longer matches `\bGCP\b`, so a second `--fix`
  // pass is a no-op).
  //
  // Despite that engine-level fix, `GCP` -> `Google Cloud` still ships
  // `fix: false`: it is the same shape as `DMZ` -> `perimeter network` --
  // an acronym expanded into a DIFFERENT phrase than its own literal
  // expansion (`GCP` stands for "Google Cloud Platform", not "Google
  // Cloud"), not a respelling. `GCP` also has unrelated expansions in other
  // domains (e.g. "Good Clinical Practice", "Grade Control Point"). The
  // engine-level case-preservation fix above is real and still applies to
  // detection; only auto-fix is unsafe here.
  rules['google/gcp-name'] = swapRule({
    pairs: { GCP: 'Google Cloud' },
    message: 'Use "%s" instead of "%s" (Google product naming).',
    link: WORD_LIST,
    fix: false,
    wordBoundary: true,
  });

  // Case-only corrections for specific branded phrases (Google Play
  // services, Google Account) — deliberately case-sensitive keys, matching
  // only the wrongly-cased literal form, so ordinary capitalization
  // elsewhere is untouched. `markdown`/`material design`/`search console`
  // live in `google/brand-capitalization-proper-noun` below instead: unlike
  // "Google account"/"Google Play Services" (whose SOURCE text is
  // unambiguous -- there's no other sense of "Google account"), those three
  // sources are plain lowercase common phrases with a real, unrelated
  // generic meaning, and capitalizing them ASSUMES every occurrence means
  // Google's own product.
  rules['google/brand-capitalization'] = swapRule({
    pairs: {
      'Google Play Services': 'Google Play services',
      'Google account': 'Google Account',
      'Google accounts': 'Google Accounts',
      // A pure casing correction of the identical tool name, not a
      // substitution, so it lives here rather than in `product-names`.
      cURL: 'curl',
    },
    message: 'Use "%s" instead of "%s" (Google: fixed brand capitalization).',
    link: WORD_LIST,
    wordBoundary: true,
  });

  // `markdown` (retail: "a markdown of thirty percent") is both a homograph
  // (an unrelated, common retail/finance sense) AND a proper-noun risk in
  // the other direction: capitalizing every lowercase occurrence assumes it
  // always refers to the Markdown markup language. `material design` has
  // the same shape: a plain phrase describing physical materials used in a
  // design ("the material design of the building incorporates local
  // stone") that this pair would wrongly capitalize into Google's own
  // design-language name. `search console` is a generic, lowercase
  // descriptive phrase (an admin/tuning panel for a search feature) other
  // tools also use generically, not exclusively Google's product name.
  rules['google/brand-capitalization-proper-noun'] = swapRule({
    pairs: {
      markdown: 'Markdown',
      'material design': 'Material Design',
      'search console': 'Search Console',
    },
    message: 'Use "%s" instead of "%s" (Google: fixed brand capitalization).',
    link: WORD_LIST,
    fix: false,
    wordBoundary: true,
  });

  // ======================================================================
  // COMPOUND / ONE-WORD FORMS — `warn`.
  // ======================================================================

  rules['google/compound-forms'] = swapRule({
    pairs: {
      'e-mail': 'email',
      'E-mail': 'email',
      'e-commerce': 'ecommerce',
      'web page': 'webpage',
      'check box': 'checkbox',
      'code base': 'codebase',
      'code lab': 'codelab',
      'code-lab': 'codelab',
      'data store': 'datastore',
      datacenter: 'data center',
      datatype: 'data type',
      'file name': 'filename',
      filesystem: 'file system',
      'front-end': 'frontend',
      'front end': 'frontend',
      'back-end': 'backend',
      'back end': 'backend',
      'host name': 'hostname',
      'end point': 'endpoint',
      'name space': 'namespace',
      nameserver: 'name server',
      'life cycle': 'lifecycle',
      'life-cycle': 'lifecycle',
      'live stream': 'livestream',
      'health care': 'healthcare',
      'health-care': 'healthcare',
      'on prem': 'on-premises',
      'on premise': 'on-premises',
      'on-premise': 'on-premises',
      'read only': 'read-only',
      'pre-built': 'prebuilt',
      'run book': 'runbook',
      'screen shot': 'screenshot',
      'time stamp': 'timestamp',
      'time frame': 'timeframe',
      'time-to-live': 'time to live',
      'tool kit': 'toolkit',
      'tool-kit': 'toolkit',
      'touch screen': 'touchscreen',
      'user base': 'userbase',
      'walk-through': 'walkthrough',
      webserver: 'web server',
      'white paper': 'whitepaper',
      'white space': 'whitespace',
      'wild card': 'wildcard',
      statusbar: 'status bar',
      'status-bar': 'status bar',
      'key/value pair': 'key-value pair',
      'key value pair': 'key-value pair',
      singlemost: 'single most',
      signin: 'sign-in',
      signout: 'sign-out',
      'auto-healing': 'autohealing',
      'auto-scaling': 'autoscaling',
      'auto-populate': 'autopopulate',
      'auto populate': 'autopopulate',
      'auto-tagging': 'autotagging',
      'pre-capture': 'precapture',
      'pre-emptible': 'preemptible',
      preexisting: 'pre-existing',
      'pre-recorded': 'prerecorded',
      'preshared key': 'pre-shared key',
      'pre-submit': 'presubmit',
      'meta-feed': 'metafeed',
      'meta-generation': 'metageneration',
      'inter-cluster': 'intercluster',
      'sub-tree': 'subtree',
      'sub-zone': 'subzone',
      'sub zone': 'subzone',
      subcommand: 'sub-command',
      'co-locate': 'colocate',
      'blue/green': 'blue-green',
      'blue green': 'blue-green',
      'parent\u2014child': 'parent-child',
      'long running operation': 'long-running operation',
      'hard-code': 'hardcode',
      'hard-coded': 'hardcoded',
      'in-line': 'inline',
      Unixlike: 'Unix-like',
      'Unix like': 'Unix-like',
      'resource recordset': 'resource record set',
    },
    message: 'Use "%s" instead of "%s" (Google compound-word form).',
    link: WORD_LIST,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Split out of `compound-forms` above. These five pairs are NOT
  // spacing/hyphenation variants of the same words -- they substitute a
  // different word or phrase entirely:
  // `data cleansing` -> `data cleaning` swaps "cleansing" for "cleaning"
  // (different words); `transcompile` -> `transpile` swaps two competing
  // compiler-jargon terms, not a spelling variant of one word;
  // `autoupdate` -> `automatically update` expands "auto" into a different
  // word ("automatically") rather than just respacing/rehyphenating;
  // `pre-emptive` -> `preemptible` swaps a different adjective (an
  // "emptive"/"emptible" suffix change, not a hyphenation of the same
  // word -- "pre-emptive" describes acting in advance, "preemptible"
  // describes being subject to preemption); `noops`/`NoOps` ->
  // `fully managed` replaces a branded term with an unrelated descriptive
  // phrase, the same shape as `DMZ` -> `perimeter network`.
  rules['google/compound-forms-word-choice'] = swapRule({
    pairs: {
      'data cleansing': 'data cleaning',
      transcompile: 'transpile',
      autoupdate: 'automatically update',
      'pre-emptive': 'preemptible',
      noops: 'fully managed',
      NoOps: 'fully managed',
    },
    message: 'Use "%s" instead of "%s" (Google compound-word form).',
    link: WORD_LIST,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // `datasource` -> `data source` is also split out of `compound-forms`
  // above, for a different reason than its siblings in
  // `compound-forms-word-choice` -- this one genuinely IS the same word
  // respaced, but `DataSource` (and
  // its lowercase form `datasource`) is a real, load-bearing TYPE/CLASS
  // NAME in Java and the Spring framework (`javax.sql.DataSource`,
  // `spring.datasource.*` config properties) -- exactly the kind of
  // technical content Redocly's own docs cover. Respacing it inside a code
  // discussion ("configure the datasource bean") would corrupt a reference
  // to the actual class/property name.
  rules['google/compound-forms-proper-noun'] = swapRule({
    pairs: {
      datasource: 'data source',
    },
    message: 'Use "%s" instead of "%s" (Google compound-word form).',
    link: WORD_LIST,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Split out of `compound-forms` above. "colo" is a noun ("a colocation
  // facility"); "colocate" is a verb. Swapping one for the other
  // unconditionally turns "The colo hosts the racks." into "The colocate
  // hosts the racks." -- grammatically broken, not merely a style nit.
  // `fix: false` keeps the detection (the noun form is
  // still worth flagging toward the guide's preferred "colocation
  // facility"/"colocate" phrasing) without silently rewriting a sentence
  // into bad grammar.
  rules['google/colo-form'] = swapRule({
    pairs: { colo: 'colocate' },
    message: 'Use "%s" instead of "%s" (Google compound-word form).',
    link: WORD_LIST,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // `'in line': 'inline'` is deliberately not a pair in `compound-forms`
  // above, or anywhere else -- not merely scoped or `fix: false`'d.
  // Google's own quote ("One word as an adjective, inline, not in line or
  // in-line") only objects to the ADJECTIVAL use, but "in line" is at
  // least as common as the correct idiom "in line with" or the plain verb
  // phrase "wait in line" / "stand in line", neither of which the guide
  // says anything about. There's no reliable regex-only way to tell
  // "the in line configuration" (wrong) apart from "in line with the
  // roadmap" (correct) or "wait in line" (correct), so this key is
  // excluded rather than shipped fixable or even detection-only; see
  // PROVENANCE.md's excluded-candidates list. `'in-line': 'inline'` above
  // is kept: the hyphenated spelling is essentially always the mistaken
  // adjective form Google objects to and doesn't collide with the "in
  // line with"/"wait in line" idioms, which are never written hyphenated.

  // Case-exact acronym/abbreviation forms -- deliberately NOT ignoreCase
  // (matching e.g. lowercase "https" in a URL scheme is not the target;
  // only the specific wrongly-cased literal forms below are).
  //
  // `keysAreRegex: true` is on so `OAuth 2` can carry a negative lookahead
  // (see below); every OTHER key here is plain alphanumeric/hyphen/space
  // text with no regex metacharacters, so it's byte-identical as a regex
  // source to what it was as an escaped literal -- this does not change
  // their matching behavior at all.
  //
  // `SHA1` and `Microservices` are handled separately (`google/sha1-form`
  // below, and dropped entirely -- see PROVENANCE.md). `UNICODE` and
  // `IPSEC` live in `google/acronym-caps-detect-only` below. `IO` -> `I/O`
  // also lives there: bare, case-sensitive "IO" is a real product/library
  // name in common developer use ("Socket.IO"; the period before "IO" is a
  // non-word character, so `\bIO\b` matches inside it), an unrelated sense
  // a blind fix would corrupt ("Socket.IO connects clients" -> "Socket.I/O
  // connects clients"). `I-O` -> `I/O` lives in
  // `google/acronym-forms-proper-noun` below instead, for the hyphenated
  // form specifically: "I-O DATA" (I-O DATA DEVICE, INC.) is a real, major
  // Japanese PC-peripherals manufacturer whose brand is written exactly
  // "I-O" (hyphenated, capital letters) -- the same shape as `FinTech`
  // below. `FinTech` -> `fintech` lives there too: "FinTech Group AG" is a
  // real company whose name keeps the mixed-case "FinTech" spelling this
  // pair would lowercase.
  rules['google/acronym-forms'] = swapRule({
    pairs: {
      HTTPs: 'HTTPS',
      IPSec: 'IPsec',
      'No-SQL': 'NoSQL',
      'No SQL': 'NoSQL',
      // Without the lookahead, `\bOAuth 2\b` also matches inside the
      // CORRECT "OAuth 2.0" (the "." after "2" is a non-word character, so
      // the trailing `\b` is satisfied trivially), and `runRulesUntilStable`
      // would re-fire the fix on its own output every pass, compounding
      // into "OAuth 2.0.0.0.0.0.0". The negative lookahead blocks a match
      // wherever "OAuth 2" is immediately followed by the literal ".0" it
      // would be redundant to append, so the already-correct form is left
      // alone and the fix is idempotent; `OAuth2` -> `OAuth 2.0` (the
      // intended path) is unaffected since that key has no space to begin
      // with.
      'OAuth 2(?!\\.0)': 'OAuth 2.0',
      OAuth2: 'OAuth 2.0',
      Oauth: 'OAuth 2.0',
      'micro-services': 'microservices',
      'fin-tech': 'fintech',
      adtech: 'ad tech',
      'ad-tech': 'ad tech',
    },
    message: 'Use "%s" instead of "%s" (Google: fixed acronym/abbreviation form).',
    link: WORD_LIST,
    wordBoundary: true,
    keysAreRegex: true,
  });

  // `fin-tech`/`adtech`/`ad-tech` (all lowercase, no case change involved)
  // don't carry the same risk as `FinTech`/`I-O`: with this rule
  // case-sensitive (no `ignoreCase`), an all-lowercase key can never match
  // a capitalized brand name like "FinTech Group AG" or "I-O DATA" in the
  // first place, so there's nothing to collide with. Only the two
  // case/hyphen-sensitive forms that DO match a real brand's own casing
  // move to detection-only here.
  rules['google/acronym-forms-proper-noun'] = swapRule({
    pairs: {
      'I-O': 'I/O',
      FinTech: 'fintech',
    },
    message: 'Use "%s" instead of "%s" (Google: fixed acronym/abbreviation form).',
    link: WORD_LIST,
    fix: false,
    wordBoundary: true,
    keysAreRegex: true,
  });

  // `applyMatchCase` infers a REPLACEMENT's casing from the MATCHED text --
  // correct when the matched text's casing is incidental (e.g. a
  // sentence-initial capital), but wrong here, where the ALL-CAPS shape IS
  // the entire violation. Matching "UNICODE" (all-caps) makes
  // `applyMatchCase` upper-case the replacement "Unicode" back into
  // "UNICODE" -- byte-identical to the input, so the "fix" changes nothing
  // and `--fix` reports it fixed while leaving the violation in place
  // forever (same failure shape as `Microservices` below). `IPSEC` ->
  // `IPsec` hits the exact same round-trip ("IPsec" upper-cased is
  // "IPSEC"). `fix: false` stops silently no-op "fixing" these; detection
  // is unaffected.
  //
  // `applyMatchCase` only skips the all-caps upper-casing for MULTI-WORD
  // replacements (the fix that makes `google/gcp-name` above safe to
  // detect against) -- `"Unicode"` and `"IPsec"` are each a SINGLE word, so
  // neither qualifies, and the round-trip no-op described above still
  // applies: `applyMatchCase('UNICODE', 'Unicode')` is still
  // `'Unicode'.toUpperCase()` = `'UNICODE'`, and likewise for `IPSEC`. This
  // is a genuinely different defect shape from `GCP` (a same-word casing
  // round-trip, not a multi-word-phrase shout), so the engine change
  // correctly leaves it alone here.
  rules['google/acronym-caps-detect-only'] = swapRule({
    pairs: { UNICODE: 'Unicode', IPSEC: 'IPsec', IO: 'I/O' },
    message: 'Use "%s" instead of "%s" (Google: fixed acronym/abbreviation form).',
    link: WORD_LIST,
    wordBoundary: true,
    fix: false,
  });

  // Split out of `acronym-forms` above. The guide's own documented
  // exception says NOT to flag "SHA1" in string literals/enums or
  // hyphenated phrases such as "HMAC-SHA1" -- but a plain `\bSHA1\b` still
  // matches the "SHA1" inside "HMAC-SHA1" (the hyphen is a non-word
  // character, so `\b` holds right after it) and would rewrite it to
  // "HMAC-SHA-1", which isn't what the guide's exception allows. The
  // negative lookbehind excludes exactly the hyphen-preceded case;
  // `fix: false` keeps the remaining, unambiguous "bare SHA1" case a
  // warning, not an auto-fix, since even outside a hyphenated compound the
  // safest default for a mid-sentence hit is a human decision, not a
  // silent rewrite.
  rules['google/sha1-form'] = swapRule({
    pairs: { '(?<!-)\\bSHA1\\b': 'SHA-1' },
    message: 'Use "%s" instead of "%s" (Google: fixed acronym/abbreviation form).',
    link: WORD_LIST,
    wordBoundary: false,
    keysAreRegex: true,
    fix: false,
  });

  // ======================================================================
  // INCLUSIVE LANGUAGE / ABLEIST LANGUAGE / JARGON WITH PEOPLE REFERENCES
  // — `warn`.
  // ======================================================================

  // "Never use [master] in conjunction with slave." Only "slave" ships as
  // a swap: bare "master" has too many unrelated everyday senses (a
  // master's degree, master bedroom, master key, git's old default branch
  // name) and Google's own quote scopes the objection to the master/slave
  // PAIRING, not the standalone word.
  rules['google/master-slave'] = swapRule({
    pairs: { slave: 'worker' },
    message: 'Avoid "%s"; use "worker" or "replica" instead (Google).',
    link: `${WORD_LIST}#slave`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // Noun forms only -- the guide itself says a word-for-word swap isn't
  // the best fix for the verb forms ("blacklisted the domain").
  rules['google/blacklist-whitelist'] = swapRule({
    pairs: {
      blacklist: 'denylist',
      whitelist: 'allowlist',
      graylist: 'denylist',
      greylist: 'denylist',
    },
    message: 'Use "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#blacklist`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/black-white-hat'] = swapRule({
    pairs: {
      'black hat': 'unethical',
      blackhat: 'unethical',
      'white hat': 'ethical',
      whitehat: 'ethical',
    },
    message: 'Use a precise term such as "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#blackhat`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // Different-word substitutions, not respellings -- matches the sibling
  // inclusive-language rules in this file (`blacklist-whitelist`,
  // `black-white-hat`), which ship `fix: false` for the identical reason.
  rules['google/black-white-box-testing'] = swapRule({
    pairs: {
      'black-box testing': 'opaque-box testing',
      'black box testing': 'opaque-box testing',
      'white-box testing': 'clear-box testing',
      'white box testing': 'clear-box testing',
      'black-box monitoring': 'synthetic monitoring',
      'white-box monitoring': 'introspective monitoring',
    },
    message: 'Use "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#black-box`,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Different-word substitution, not a respelling -- detection-only.
  rules['google/grayed-out'] = swapRule({
    pairs: { 'grayed-out': 'unavailable', 'greyed-out': 'unavailable' },
    message: 'Use "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#grayed-out`,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['google/grandfathered'] = swapRule({
    pairs: { grandfathered: 'legacy', 'grandfather clause': 'exempt' },
    message: 'Use "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#grandfathered`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/gendered-terms'] = swapRule({
    pairs: {
      'you guys': 'everyone',
      guys: 'everyone',
      'male adapter': 'plug',
      'female adapter': 'socket',
      'man hours': 'person hours',
      manhours: 'person hours',
      manmade: 'artificial',
      'man made': 'artificial',
      manned: 'staffed',
      manpower: 'staff',
      'man-power': 'staff',
      'man-in-the-middle': 'on-path attacker',
      'he/she': 'they',
      webmaster: 'website owner',
    },
    message: 'Use non-gendered language such as "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#man_hours`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/jargon-with-people-references'] = swapRule({
    pairs: {
      gypsy: 'Romani',
      ghetto: 'clumsy',
      ninja: 'expert',
      guru: 'expert',
      sherpa: 'guide',
      dojo: 'training',
      'mom test': 'beginner user test',
      'grandma test': 'beginner user test',
      'girlfriend test': 'beginner user test',
      'monkey test': 'automated, random tests',
      'brown bag': 'learning session',
      'brown-bag': 'learning session',
      'build cop': 'build monitor',
      'build sheriff': 'build monitor',
      'war room': 'incident-management team',
      warroom: 'incident-management team',
      'final solution': 'solution',
      'demilitarized zone': 'perimeter network',
      DMZ: 'perimeter network',
      denigrate: 'disparage',
      sexy: 'elegant',
      nuke: 'remove',
      voodoo: 'mysterious',
      'first-class citizen': 'higher-order value',
      'first class citizen': 'higher-order value',
    },
    message: 'Use a precise term such as "%s" instead of "%s" (Google jargon/inclusive language).',
    link: `${WORD_LIST}#ninja`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // Figurative senses only (Google's own carve-out permits these words to
  // describe inanimate objects/systems -- not people). "mad" is excluded:
  // it is at least as commonly used to mean "angry", a sense Google never
  // objects to. "hang"/"hung" are excluded too: both are extremely
  // polysemous ("hung the picture", "hung jury", "hang up the phone").
  rules['google/ableist-figurative-terms'] = swapRule({
    pairs: {
      crazy: 'unexpected',
      insane: 'unexpected',
      lunatic: 'unexpected',
      bonkers: 'unexpected',
      loony: 'unexpected',
      sane: 'valid',
      'sanity check': 'quick check',
      'dumb down': 'simplify',
      retarded: 'slowed',
    },
    message:
      'Use a precise term such as "%s" instead of "%s" when describing a system or object (Google).',
    link: `${WORD_LIST}#crazy`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/dummy-variable'] = swapRule({
    pairs: { 'dummy variable': 'placeholder' },
    message:
      'Use "%s" instead of "%s" (Google): for a statistics sense, see the word list for alternatives.',
    link: `${WORD_LIST}#dummy-variable`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // The figurative sense only -- "blind writes"/"blind change" are real,
  // distinct technical terms in the SAME word-list entry, so a bare
  // `\bblind\b` match would hit those too. Detection-only, not a swap.
  rules['google/blind-figurative'] = patternRule({
    tokens: ['\\bblind to\\b', '\\bblind eye to\\b'],
    message: 'Use "ignore", "unaware of", "disregard", or "reject" instead of "%s" (Google).',
    link: `${WORD_LIST}#blind`,
    ignoreCase: true,
  });

  // Resolved to the PERSON-REFERENCE sense of "blind" (person who is
  // blind / visually impaired / low-vision) -- NOT the figurative sense
  // above. "unsighted"/"visually challenged" are themselves people-
  // referring euphemisms, so the figurative replacement set would be
  // nonsensical here.
  rules['google/unsighted-visually-challenged'] = swapRule({
    pairs: {
      unsighted: 'person who is blind',
      'visually challenged': 'person who is visually impaired',
    },
    message: 'Use "%s" instead of "%s" (Google inclusive language).',
    link: `${WORD_LIST}#unsighted`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  rules['google/disability-language'] = swapRule({
    pairs: {
      'the disabled': 'people with disabilities',
      'a quadriplegic': 'a quadriplegic person',
      'wheelchair-bound': 'uses a wheelchair',
      'suffering from': 'experiencing',
      'victim of': 'living with',
    },
    message: 'Use "%s" instead of "%s" (Google inclusive documentation).',
    link: INCLUSIVE_DOCUMENTATION,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // Framed as technical-jargon/precision, NOT ableist language: Google's
  // own entries for these never mention people at all ("chubby" is about
  // vague resource sizing, "fat client"/"fat connection" are about
  // imprecise technical modifiers, with an explicit FAT-filesystem
  // carve-out for bare "fat"). Bare "fat" is deliberately excluded.
  rules['google/technical-jargon-precision'] = swapRule({
    pairs: {
      'fat client': 'full-featured client',
      'fat connection': 'high-capacity network connection',
      chubby: 'overextended',
    },
    message:
      'Use a precise term such as "%s" instead of "%s" (Google: technical-jargon precision, not people).',
    link: `${WORD_LIST}#fat`,
    ignoreCase: true,
    wordBoundary: true,
    fix: false,
  });

  // ==========================================================================
  // DETECTION-ONLY: structural override, not a per-rule policy.
  //
  // Every individual `fix: false` set above (and every rule that never had a
  // `fix` option to begin with, like `patternRule`/`tokenRule`-built entries)
  // is REDUNDANT with this loop, not load-bearing -- this loop forces every
  // rule in this preset to `fix: false` regardless of what its own builder
  // call sets, so a future contributor cannot silently reintroduce fixing
  // here by adding a new pair, omitting `fix: false` on a new `swapRule()`
  // call, or "fixing" what looks like an oversight. See this file's header
  // doc ("DETECTION-ONLY BY DESIGN" section) and
  // `presets/google/PROVENANCE.md`'s "Detection-only" section for why:
  // adversarial testing of this preset's (and `recheck/microsoft`'s)
  // previously-fixable pairs found real corruption spanning every category
  // once believed safe, including spelling and hyphenation. A rule's
  // category does not predict fix-safety -- so the override is structural,
  // not a per-rule judgment call.
  //
  // The permanent guarantee this creates is `presets.test.ts`/
  // `preset-google.test.ts`'s "no rule in recheck/google is fixable" test,
  // which reads this LIVE returned object (not a hand-maintained list of
  // rule names) -- the same derive-from-the-preset shape the per-pair
  // coverage gate already uses. Detection is unaffected: `execute()` still
  // runs and reports for every rule; only `fix()` is gated off, via
  // `core/runner.ts`'s `rule.fix !== false` check.
  for (const rule of Object.values(rules)) {
    rule.fix = false;
  }

  return rules;
}
