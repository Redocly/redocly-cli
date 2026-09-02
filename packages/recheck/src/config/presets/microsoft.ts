import type { BaseRule, RecheckConfig } from '../../types/index.js';

/**
 * `recheck/microsoft` — the Microsoft Writing Style Guide
 * (https://learn.microsoft.com/en-us/style-guide/welcome/), adapted to
 * Recheck assertions.
 *
 * Source: Microsoft Writing Style Guide
 * Canonical URL: https://learn.microsoft.com/en-us/style-guide/welcome/
 * Upstream status: **archived** as of 2024-11-13 (Microsoft stopped actively
 * updating the guide on that date; the content remains published and is
 * still the guide Microsoft itself links to). The pages continue to receive
 * occasional copyedits after that date (see sources.json fetch dates), so
 * "archived" describes editorial status, not staleness of the text quoted
 * here.
 * License: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) — see
 * the licence note below; the grant is NOT stated on any learn.microsoft.com
 * page.
 * Sync date: 2026-07-30.
 *
 * LICENCE, READ BEFORE COPYING A LINK FROM THIS FILE: no `learn.microsoft.com`
 * page states a licence anywhere (verified: zero hits for "creative commons"/
 * "cc-by"/"licensed under" across every fetched page; the only copyright text
 * on the site is a sitewide "(c) Microsoft. All rights reserved." footer).
 * The CC-BY-4.0 grant lives one hop away, in the backing GitHub repository
 * every style-guide page's `content_git_url` metadata points at:
 * https://github.com/MicrosoftDocs/microsoft-style-guide/blob/main/LICENSE
 * (confirmed via GitHub's license-detection API and the raw LICENSE file
 * itself — both independently agree: CC BY 4.0). The site's Terms of Use
 * (https://learn.microsoft.com/en-us/legal/termsofuse) explicitly defers to
 * this: "Certain documentation may be subject to explicit license terms
 * separate from the terms contained here. To the extent the terms conflict,
 * the explicit license terms control." So: CC-BY-4.0 attribution is correct
 * to ship, but every `link:` below points at the learn.microsoft.com page the
 * rule's TEXT comes from (per spec §3), never at a page claiming to state the
 * licence — because none does. See PROVENANCE.md's licence section for the
 * full citation chain.
 *
 * PROVENANCE DISCIPLINE (why this file looks the way it does): every rule
 * below was confirmed against a LIVE fetch of its cited page by one of four
 * independent verification passes (task-10-verify-{E,F,G,H}.md) — ~490
 * rules/entries checked across ~340 page fetches. The word list produced 7
 * contradictions, 1 fabrication, 3 crossed pairings, and 1 inverted verdict
 * in the research draft this preset's candidate list started from; none of
 * those defects are shipped here. See `packages/recheck/presets/microsoft/
 * PROVENANCE.md` for the full rule -> source page -> quote -> verdict table,
 * including every candidate rule considered and NOT shipped, and why, and
 * `packages/recheck/presets/microsoft/sources.json` for the fetched-page
 * hashes drift detection needs.
 *
 * SEVERITY POLICY: structural/document-mechanics rules (heading, list, table,
 * alt-text, link-text mechanics) are `error`, matching `recheck/google`'s
 * convention. The A-Z word list's three "unconditional" tiers (Tier 1 general
 * terminology, Tier 2 accessibility/people-first language, Tier 3 spelling
 * and hyphenation normalization) also ship at `error`, per the research's own
 * "ship at error" framing for those tiers (§5a/§5b/§5c) — these are
 * "never use" rules, not softer style preferences, and every verifier
 * confirmed them as unconditional (once Tier 4's audience-conditional
 * entries are removed — see below). Everything else — voice, contractions,
 * punctuation conventions, UI-verb terminology, and any rule whose detection
 * mechanism is a narrowed heuristic rather than a complete test of the
 * guide's stated rule — is `warn`.
 *
 * DETECTION-ONLY BY DESIGN: this preset never auto-fixes any rule, full
 * stop. `buildMicrosoftPreset()` forces `fix: false` onto every rule it
 * returns, structurally, regardless of what an individual rule's own builder
 * call sets — see the loop at the end of that function. Adversarial testing
 * of auto-fix on this preset's (and `recheck/google`'s) swap pairs found
 * corruption spanning every category once assumed safe — including
 * spelling and hyphenation — under the "same word normalized" criterion
 * described below. Concrete failures: Hemingway's *A Moveable Feast* → "A
 * Movable Feast" (spelling), "read only the introduction" → "read-only the
 * introduction" (hyphenation), "No SQL is used here" → "NoSQL is used here"
 * (meaning inverted outright). A rule's category does not predict
 * fix-safety at this scale — a style guide describes intent,
 * `swap`/`consistency`/`pattern` match tokens, and that gap does not close
 * by further narrowing which categories are "safe." Detection is
 * unaffected and is this preset's entire product: every rule still runs
 * `execute()` and reports; only `fix()` is gated off. See
 * `presets/microsoft/PROVENANCE.md`'s "Detection-only" section for the full
 * corruption examples, and `preset-microsoft.test.ts`'s preset-derived "no
 * rule is fixable" test for the permanent guarantee.
 *
 * The reasoning from "FIX SAFETY, READ BEFORE ADDING A PAIR" through
 * "FIX-POSTURE" below remains accurate even though the blanket override
 * above makes it redundant in practice: it records which pairs
 * are same-word normalizations versus different-word substitutions, and
 * which carry a case-only or verb-able hazard — the criteria that would
 * matter again if this preset's auto-fix were ever reconsidered. As of the
 * override above, no pair in this file is currently fixable.
 *
 * FIX SAFETY, READ BEFORE ADDING A PAIR: three hazards are handled per pair
 * below rather than by a single blanket rule:
 *   - CASE-ONLY (`fix: false`): a pair whose replacement differs from the
 *     avoid-term ONLY by case (Web -> web, Registry -> registry, ...).
 *     `applyMatchCase` (src/core/case-preserve.ts) reapplies the MATCH's
 *     casing to the replacement, so fixing "Web" reproduces "Web" — a
 *     silent, permanent no-op. `az-case-only` below.
 *   - VERB-ABLE (`fix: false`, message says "rewrite" not "replace"): a pair
 *     whose avoid-term can be used as a verb but whose replacement is a noun
 *     phrase (whitelist an IP -> allow list an IP is ungrammatical).
 *     `az-verb-able` below.
 *   - SUBSTRING/HOMOGRAPH risk: bare single letters/punctuation (x, +),
 *     hyphen-joined compounds that share a bare token with the avoid-term
 *     (double-click, x-axis), and whole-word homographs with an unrelated
 *     common meaning (may/May the month, that, star) are excluded from this
 *     preset entirely rather than shipped with a marginal regex guard — see
 *     PROVENANCE.md's excluded-candidates table.
 * `applyMatchCase` itself is out of scope for this task (shared by every
 * swap rule across every preset); its documented limitations are recorded in
 * the whole-branch review, not patched here.
 *
 * DEVELOPER-AUDIENCE CARVE-OUTS: `header`, `context menu`, `disk`, and
 * `directory` all carry a Microsoft-documented exception for developer/API
 * content — precisely Redocly's own audience. None of the four ship as
 * unconditional Tier 1 rules; running this preset on Redocly's own docs must
 * not flag "response header", "context menu (developer content)", "managed
 * disk", or "working directory". See PROVENANCE.md §5.
 *
 * TIER 4 (audience-conditional / UI-conditional) NEVER SHIPS. Five Tier-1
 * candidates in the original research draft also appeared, verbatim, on
 * Tier 4's own conditional list (`execute`, `reboot`, `navigate`, `ZIP Code`,
 * `disjoint selection`); five more were found to carry the identical
 * carve-out pattern on closer reading (`shortcut key`, `radio button`,
 * `scroll`, the x-multiplication UI exception, `Microsoft's`). None of the
 * ten ship. Additional conditional entries surfaced during authoring (not
 * pre-identified by the verifiers, but sharing the exact same
 * "unless...technical audience"/"unless it's in the UI" shape) are also
 * excluded — see PROVENANCE.md's "Additional tier-boundary findings".
 *
 * SELF-CONTRADICTIONS: three cases where two live Microsoft pages give
 * opposite guidance are enforced in NEITHER direction (no rule ships for
 * either side): `%` vs. spelled-out "percent", `etc.`, and forced line
 * breaks in paragraphs vs. the heading line-break exception. Both citations
 * per case are in PROVENANCE.md.
 *
 * `master/slave` is a fourth self-contradiction case, but unlike the three
 * above it does not ship silently permitted: both pages agree the TERM
 * should be avoided and disagree only on the REPLACEMENT, so
 * `microsoft/master-slave` ships as a `pattern` rule (no swap) naming both
 * candidates in its message rather than guessing which one the guide
 * intends. See PROVENANCE.md's "Self-contradictions" section.
 *
 * NO `metric` RULE: Microsoft's style guide publishes no readability
 * formula or grade-level target anywhere — the 7-8 grade / 60-70 Flesch
 * figures some contributors cite come from Word's Editor feature Q&A pages,
 * not the Writing Style Guide. Shipping a `metric` rule under a Microsoft
 * citation would misattribute a number the guide never states. This preset
 * instead ships the guide's own real structural numbers via `length`,
 * `list-length`, and `occurrence` — see the "Structural numbers" section.
 *
 * TIER-1 GATE COVERAGE: the clean fixture and the per-token gate both now
 * cover A-Z near-miss cases and read the live preset directly (see
 * `preset-microsoft.test.ts`) — every pair those gates can expose is either
 * anchored against its colliding sense (`exit`/`launch`/`boot`/`hang`/
 * `hangs`/`roman`/`blade`/`beta`/`visit`/`in addition`/`print out`/`click`/
 * `clicks`), moved to a detection-only `*-detect` pattern sibling
 * (`crash`/`lock up`, `quit`/`deinstall`/`reinitialize`, `italics`/
 * `italicized`, `bottom left`/`bottom right`, `thank you`,
 * `hierarchical menu`/`secondary menu`/`running head`/`running foot`,
 * `pound sign`, `as well as`, `or greater`/`or higher`/`or lower`, `visit`),
 * given `fix: false` (`left-hand`/`right-hand`, `leverage`/`leveraging`/
 * `leveraged`, `glyph`), or dropped where the guide's own carve-out is a
 * genuine meaning change in Redocly's own domain (`SMB`, `SKU`, `terminate`,
 * `de facto`/`ad hoc`/`vis-a-vis`, no replacement stated for any of the
 * three). `us-spelling`'s keys are one literal pair per inflection (not an
 * alternation group mapped to a single replacement), so every inflection
 * maps to its own correct output instead of collapsing onto whichever form
 * the config happened to name. A same-to-same self-mapping defect
 * (`'a SQL': 'a SQL'`, flagging already-correct text) is also fixed in
 * `article-before-acronym`. See PROVENANCE.md's "Fix wave B"/"Fix wave C"
 * sections for the complete per-pair disposition and reasoning, and each
 * rule's own comment below for the specific anchor/exclusion it carries.
 *
 * FIX-POSTURE: a `swap` pair keeps `fix: true` only if it is the SAME WORD
 * normalized (spelling, hyphenation, casing, or a non-standard form) —
 * never a different word or phrase substituted, however safe-looking.
 * `DMZ`, `the ask`, `home directory`, and `spec` are also anchored against
 * their most common unrelated sense so the clean fixture doesn't visibly
 * misfire on them, even though detection-only rules can no longer corrupt
 * anything. This criterion is now redundant with the blanket
 * `fix: false` override above, but still explains the "same word
 * normalized" vs. "different word/phrase substituted" reasoning attached
 * to individual rules throughout this file. See PROVENANCE.md's
 * "Fix-posture change" section for the two-axis rationale (guidance-shape
 * vs. homograph) and the complete rule-by-rule table.
 */

// -- link constants (one per distinct source page cited below) -----------
const CAPITALIZATION = 'https://learn.microsoft.com/en-us/style-guide/capitalization';
const HEADINGS = 'https://learn.microsoft.com/en-us/style-guide/scannable-content/headings';
const COLONS = 'https://learn.microsoft.com/en-us/style-guide/punctuation/colons';
const VERSUS_VS =
  'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/v/versus-vs';
const ACCESSIBILITY_WRITING =
  'https://learn.microsoft.com/en-us/style-guide/accessibility/writing-all-abilities';
const APOSTROPHES = 'https://learn.microsoft.com/en-us/style-guide/punctuation/apostrophes';
const ACRONYMS = 'https://learn.microsoft.com/en-us/style-guide/acronyms';
const LISTS = 'https://learn.microsoft.com/en-us/style-guide/scannable-content/lists';
const TABLES = 'https://learn.microsoft.com/en-us/style-guide/scannable-content/tables';
const PERIODS = 'https://learn.microsoft.com/en-us/style-guide/punctuation/periods';
const TOP_10_TIPS = 'https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice';
const DASHES_HYPHENS = 'https://learn.microsoft.com/en-us/style-guide/punctuation/dashes-hyphens/';
const NUMBERS = 'https://learn.microsoft.com/en-us/style-guide/numbers';
const QUOTATION_MARKS = 'https://learn.microsoft.com/en-us/style-guide/punctuation/quotation-marks';
const ALTERNATIVE_TEXT =
  'https://learn.microsoft.com/en-us/style-guide/accessibility/alternative-text';
const URLS_WEB_ADDRESSES = 'https://learn.microsoft.com/en-us/style-guide/urls-web-addresses';
const USE_CONTRACTIONS =
  'https://learn.microsoft.com/en-us/style-guide/word-choice/use-contractions';
const USE_US_SPELLING =
  'https://learn.microsoft.com/en-us/style-guide/word-choice/use-us-spelling-avoid-non-english-words';
const USE_SIMPLE_WORDS =
  'https://learn.microsoft.com/en-us/style-guide/word-choice/use-simple-words-concise-sentences';
const DONT_USE_COMMON_WORDS =
  'https://learn.microsoft.com/en-us/style-guide/word-choice/dont-use-common-words-in-new-ways';
const AVOID_JARGON = 'https://learn.microsoft.com/en-us/style-guide/word-choice/avoid-jargon';
const BIAS_FREE = 'https://learn.microsoft.com/en-us/style-guide/bias-free-communication';
const MILITARISTIC_LANGUAGE = 'https://learn.microsoft.com/en-us/style-guide/militaristic-language';
const ACCESSIBILITY_TERMS =
  'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/term-collections/accessibility-terms';
const AZ_BASE = 'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/';
const DESCRIBING_UI =
  'https://learn.microsoft.com/en-us/style-guide/procedures-instructions/describing-interactions-with-ui';
const FORMATTING_TEXT_IN_INSTRUCTIONS =
  'https://learn.microsoft.com/en-us/style-guide/procedures-instructions/formatting-text-in-instructions';
const MASTER_SLAVE =
  'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/m/master-slave';

// -- small builders, mirroring recheck/google's identical shape (see
// google.ts) so the two flagship presets stay structurally interchangeable
// for anyone reading both. ----------------------------------------------

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

export function buildMicrosoftPreset(): RecheckConfig {
  const rules: RecheckConfig = {};

  // ======================================================================
  // STRUCTURAL — headings, lists, tables, alt text, links (`error`).
  // ======================================================================

  // "Microsoft style uses sentence-style capitalization." (C1)
  // `fix: false`: same reasoning as recheck/google's identical rule — an
  // autofix would lowercase any proper noun not covered by the built-in
  // TECHNICAL_PROPER_NOUNS vocabulary or a user's own `exceptions`.
  rules['microsoft/heading-sentence-case'] = {
    severity: 'error',
    scope: 'heading',
    fix: false,
    link: CAPITALIZATION,
    message: '"%s" should use %s capitalization (Microsoft: sentence case for headings).',
    assertions: { capitalization: { match: '$sentence' } },
  };

  // "Always capitalize the word after the colon." (C2) — scoped to headings
  // only; Microsoft's colon rule is title/heading-specific, unlike the
  // general mid-sentence-colon rule (which this preset does not ship: the
  // guide's own table shows the mid-sentence form as merely "Acceptable",
  // not mandatory — see PROVENANCE.md).
  rules['microsoft/capitalize-after-heading-colon'] = patternRule({
    tokens: [':\\s+[a-z]'],
    message: 'Capitalize the first word after a colon in a heading (Microsoft).',
    link: COLONS,
    scope: 'heading',
  });

  // "Don't end headings with a period." / "Don't use a colon at the end of
  // titles or headings." (C3, C4). Default `punctuation` (`.,;:` with the
  // question mark stripped) already matches Microsoft's own stated
  // exceptions (`?` allowed, `!` rarely) with no override needed.
  rules['microsoft/no-trailing-punctuation'] = tokenRule({
    name: 'no-trailing-punctuation',
    message: "Don't end headings with punctuation (Microsoft).",
    link: HEADINGS,
  });

  // "Don't use ampersands (&) or plus signs (+) in headings unless you're
  // referring to UI that contains them or space is limited." (C5)
  rules['microsoft/no-ampersand-in-headings'] = {
    severity: 'warn',
    scope: 'heading',
    link: HEADINGS,
    message: 'Spell out "and"; avoid & and + in headings (Microsoft).',
    exceptions: { lines: ['C++', 'A+', '.NET'] },
    assertions: {
      pattern: { tokens: ['&(?!amp;|nbsp;|lt;|gt;|quot;|#)', '\\+'] },
    },
  };

  // "In headings, use the abbreviation vs., all lowercase. In text, spell
  // out as versus." (C6) — two scoped rules with opposite directions; a
  // single unscoped rule would fight itself.
  rules['microsoft/vs-in-headings'] = swapRule({
    pairs: { versus: 'vs.' },
    message: 'Use "%s" instead of "%s" in headings (Microsoft).',
    link: VERSUS_VS,
    scope: 'heading',
    ignoreCase: true,
    wordBoundary: true,
  });

  // `vs.` ends in a period, so a trailing `\b` right after "vs." followed by
  // a space never matches (both non-word characters) -- same class of bug
  // recheck/google's `no-latinisms` fixed for `i.e.`/`e.g.`/`vs.`. A LEADING
  // `\b` is baked into the regex source instead (`keysAreRegex`), which
  // still blocks a match inside "revs." (no boundary between "re" and "vs.")
  // without needing the trailing anchor at all.
  rules['microsoft/versus-in-text'] = swapRule({
    pairs: { '\\bvs\\.': 'versus' },
    message: 'Use "%s" instead of "%s" in body text (Microsoft).',
    link: VERSUS_VS,
    scope: ['paragraph', 'list-item', 'table.cell'],
    ignoreCase: true,
    wordBoundary: false,
    keysAreRegex: true,
  });

  // "Don't use extra line breaks to increase heading spacing." (C8)
  rules['microsoft/no-multiple-blanks'] = tokenRule({
    name: 'no-multiple-blanks',
    message: "Don't use extra blank lines to create heading spacing (Microsoft).",
    link: HEADINGS,
  });

  // "Use heading levels instead of text formatting to communicate...
  // hierarchy." (C9)
  rules['microsoft/no-emphasis-as-heading'] = tokenRule({
    name: 'no-emphasis-as-heading',
    message: 'Use a heading level, not bold or italic text, to show hierarchy (Microsoft).',
    link: ACCESSIBILITY_WRITING,
  });

  // "Don't use an apostrophe... to form the plural of a singular noun."
  // (C17) — scoped to the unambiguous decade case (`1990's`); a bare
  // `[A-Z]{2,}'s` (e.g. `API's`) is excluded on purpose: it is frequently a
  // legitimate possessive ("the API's response"), not an attempted plural
  // (see PROVENANCE.md's excluded-candidates table for C18/C20).
  rules['microsoft/no-apostrophe-plural-decade'] = patternRule({
    tokens: ["\\b(?:19|20)\\d0['\u2019]s\\b"],
    message: 'Don\'t use an apostrophe to form a plural decade (Microsoft): "%s"',
    link: APOSTROPHES,
  });

  // "a DLL / an ISP / a URL / a SQL database" (C19) — article choice
  // follows pronunciation, not spelling. `applyMatchCase` handles a
  // sentence-initial capitalized match correctly here (multi-word
  // replacement, "a"/"an" + acronym): verified "An URL" -> "A URL".
  //
  // A same-to-same self-mapping (`'a SQL': 'a SQL'`) would be a defect
  // here, not a wrong-to-right correction like its three siblings: since
  // `swap`'s `execute()` reports every regex match as a violation
  // regardless of whether match equals replacement, that would flag the
  // ALREADY-CORRECT "a SQL" (e.g. "Write a SQL query") as if it were
  // wrong, and `--fix` would reproduce identical text (a permanent, silent
  // no-op on correct prose — a false-positive DETECTION, not a
  // corruption). The pair below is `'an SQL': 'a SQL'` instead, mirroring
  // `'an SQL database'`'s own pronunciation rule for the bare acronym
  // without a following noun ("Write an SQL query" -> "Write a SQL
  // query").
  rules['microsoft/article-before-acronym'] = swapRule({
    pairs: {
      'an URL': 'a URL',
      'a ISP': 'an ISP',
      'an SQL database': 'a SQL database',
      'an SQL': 'a SQL',
    },
    message: 'Use "%s" instead of "%s" (Microsoft: article choice follows pronunciation).',
    link: ACRONYMS,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "Begin each item in a list with a capital letter unless there's a
  // reason not to." (L1) Custom regex (not `$sentence`): `$sentence` would
  // also lowercase every later word in the item, overshooting the guide's
  // rule, which only constrains the FIRST letter. Detection-only by
  // construction (custom-regex `capitalization` never produces a fix).
  rules['microsoft/list-item-capital'] = {
    severity: 'error',
    scope: 'list-item',
    fix: false,
    link: LISTS,
    message: '"%s" should start with a capital letter (Microsoft).',
    assertions: { capitalization: { match: '^[^a-z].*' } },
  };

  // "Don't use semicolons, commas, or conjunctions (like and or or) at the
  // end of list items." (L2)
  rules['microsoft/no-trailing-conjunction-list'] = patternRule({
    tokens: ['[,;]$', '\\b(?:and|or)$'],
    message: 'Don\'t end a list item with a semicolon, comma, or conjunction (Microsoft): "%s"',
    link: LISTS,
    scope: 'list-item',
    ignoreCase: true,
  });

  // "Don't use ellipses at the end of column headers." (T2)
  rules['microsoft/no-ellipsis-column-header'] = patternRule({
    tokens: ['(?:\\.\\.\\.|\u2026)$'],
    message: 'Don\'t end a table column header with an ellipsis (Microsoft): "%s"',
    link: TABLES,
    scope: 'table.header',
  });

  // "Don't leave a cell blank or use an em dash [for 'no entry']. Instead,
  // use Not applicable or None." (T3) — NARROWED, deliberately, to the em
  // dash case only; the guide's other half ("don't leave a cell blank") is
  // NOT enforced. This is a `pattern`-assertion architectural limit, not a
  // missed narrowing pass: a truly blank cell (no `tableContent` descendant
  // at all -- an empty `| |` cell, or one that's pure whitespace, which the
  // GFM table parser trims to nothing) reaches this rule as a segment whose
  // `content` is the empty string (see scopes/extractor.ts's `tableRow`
  // case). Every `pattern` token runs through `regex.exec(content)`, and
  // matching ANY token -- including this one -- against `''` can only ever
  // produce a ZERO-WIDTH match; pattern.ts explicitly skips zero-width
  // matches (`match[0].length === 0`) because they carry no real text to
  // report or fix, the same guard `swap`/`conditional`/`repetition` use for
  // the same reason. So a blank cell structurally cannot be reported by a
  // `pattern` token, no matter how the token is written -- reporting "this
  // segment is empty" is an EXISTENCE check ("flag when a pattern is
  // absent"), not a pattern MATCH, and `validate.ts`'s `PatternAssertion`
  // doc comment already notes that shape is a planned-but-not-yet-built
  // Vale-parity feature. Properly detecting a blank cell needs either a
  // token rule (walking the table's AST cells directly, the way
  // `table-column-count`/`table-column-style` do) or an extractor-level
  // change (e.g. emitting a sentinel for an empty cell so a pattern has
  // literal text to match) -- out of scope for a `pattern`-only rule, so
  // this rule instead does the one thing a `pattern` token CAN actually
  // detect (a cell containing exactly an em dash, non-empty content) and
  // says so honestly, rather than shipping a message/PROVENANCE claim
  // ("covers a blank cell") the implementation cannot back up. A project
  // that wants the blank-cell half enforced needs a custom check outside
  // this preset until that feature lands.
  //
  // Token: the pattern is `^\s*(?:<em-dash>\s*)?$`, not the old
  // `^\s*(?:<em-dash>)?\s*$` -- the two separate `\s*` groups either side of
  // the optional em dash let the engine try many different ways to split a
  // run of whitespace between them before settling on the overall match,
  // which is quadratic on a long whitespace-only cell (632ms measured on a
  // 32KB one). Folding the trailing `\s*` INSIDE the optional group removes
  // that ambiguity: for whitespace-only content the leading `\s*` alone
  // consumes everything, linearly, and the inner group is never re-tried
  // against the same run.
  rules['microsoft/no-blank-table-cell'] = patternRule({
    tokens: ['^\\s*(?:\u2014\\s*)?$'],
    message: 'Use "Not applicable" or "None" instead of an em dash in a table cell (Microsoft).',
    link: TABLES,
    scope: 'table.cell',
  });

  // "Put one space, not two, after a period." / (top-10-tips broadens this
  // to periods, question marks, AND colons.) (P1)
  rules['microsoft/single-space-after-punctuation'] = patternRule({
    tokens: ['[.!?:]\\s{2,}(?=[A-Z])'],
    message: 'Use one space, not two, after end punctuation (Microsoft).',
    link: PERIODS,
  });

  // "Don't use spaces around em dashes." (P2) — narrowed to the EM dash
  // only. The guide's en-dash rule has an explicit, worked exception for UI
  // timestamps and dual date/time ranges ("2:15 PM \u2013 4:45 PM"); a blind
  // regex can't tell that case apart from the ordinary prohibited case, so
  // en dash spacing is not enforced here at all (see PROVENANCE.md).
  rules['microsoft/no-space-around-em-dash'] = patternRule({
    tokens: ['\\s\u2014\\s'],
    message: "Don't use spaces around an em dash (Microsoft).",
    link: DASHES_HYPHENS,
  });

  // "Don't use from before a range indicated by an en dash." (P5)
  rules['microsoft/no-from-before-en-dash-range'] = patternRule({
    tokens: ['\\bfrom\\s+\\d+\\s*[\u2013\u2014]\\s*\\d+'],
    message: 'Don\'t use "from" before an en-dash number range (Microsoft): "%s"',
    link: NUMBERS,
  });

  // "Use straight quotation marks... Segoe Sans... does not have a curly
  // quotation mark option." (P7) Mechanical, unambiguous, autofixable.
  rules['microsoft/straight-quotes'] = swapRule({
    pairs: {
      '\u201c': '"',
      '\u201d': '"',
      '\u2018': "'",
      '\u2019': "'",
    },
    message: 'Use straight quotation marks, not curly ones (Microsoft).',
    link: QUOTATION_MARKS,
  });

  // "Always spell out ordinal numbers." (N3)
  rules['microsoft/spell-out-ordinals'] = patternRule({
    tokens: ['\\b\\d+(?:st|nd|rd|th)\\b'],
    message: 'Spell out ordinal numbers; avoid "%s" (Microsoft).',
    link: NUMBERS,
  });

  // "Don't add -ly to an ordinal number, as in firstly or secondly." (N4)
  rules['microsoft/ordinal-no-ly'] = swapRule({
    pairs: { firstly: 'first', secondly: 'second', thirdly: 'third' },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: NUMBERS,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "Don't use numerals for 12:00. Use noon or midnight instead." (N8)
  rules['microsoft/noon-midnight'] = patternRule({
    tokens: ['\\b12:00\\s*(?:AM|PM|am|pm)\\b'],
    message: 'Use "noon" or "midnight" instead of "%s" (Microsoft).',
    link: NUMBERS,
  });

  // "Add alt text to all images that convey important meaning." (A1)
  rules['microsoft/no-alt-text'] = tokenRule({
    name: 'no-alt-text',
    message: 'Every image needs alt text (Microsoft: accessibility).',
    link: ALTERNATIVE_TEXT,
  });

  // "Limit the length to 150 characters." (A2) — one of this preset's four
  // guide-stated structural numbers (see "Structural numbers" note above
  // the rules).
  rules['microsoft/alt-text-length'] = {
    severity: 'warn',
    scope: 'alt',
    link: ALTERNATIVE_TEXT,
    message: 'Alt text is %s %s long; Microsoft limits it to 150 characters (max %s).',
    assertions: { length: { unit: 'characters', max: 150 } },
  };

  // "Begin alt text with a capital letter. End it with a period." (A3)
  // Detection-only by construction (custom-regex `capitalization`).
  // Limitation: the guide's own carve-out ("even if it's just a fragment,
  // if doing so is practical for the image type") is not modeled — see
  // PROVENANCE.md.
  rules['microsoft/alt-text-format'] = {
    severity: 'warn',
    scope: 'alt',
    fix: false,
    link: ALTERNATIVE_TEXT,
    message: 'Alt text should start with a capital letter and end with a period (Microsoft).',
    assertions: { capitalization: { match: '^[A-Z].*\\.$' } },
  };

  // "Don't start alt text with 'Image.'" / "Don't start... with 'Button' or
  // 'Link.'" (A4) — Screenshot/Diagram/Photograph/Chart/Drawing are
  // prescribed openers per the same page, so they are deliberately absent
  // from this pattern.
  rules['microsoft/alt-text-generic-opener'] = patternRule({
    tokens: ['^(?:Image|Icon|Graphic|Button|Link)\\b'],
    message: 'Don\'t start alt text with a generic word such as "%s" (Microsoft).',
    link: ALTERNATIVE_TEXT,
    scope: 'alt',
    ignoreCase: true,
  });

  // "Don't use the file name of an image as alt text." (A5)
  rules['microsoft/alt-text-no-filename'] = patternRule({
    tokens: ['\\.(?:png|jpe?g|gif|svg|webp)$'],
    message: "Don't use an image's file name as its alt text (Microsoft).",
    link: ALTERNATIVE_TEXT,
    scope: 'alt',
    ignoreCase: true,
  });

  // "rather than a generic phrase like click here" (A6)
  rules['microsoft/descriptive-link-text'] = tokenRule({
    name: 'descriptive-link-text',
    message: 'Link text should be descriptive, not a generic phrase (Microsoft).',
    link: URLS_WEB_ADDRESSES,
  });

  // ======================================================================
  // STRUCTURAL NUMBERS — the guide's own real numeric thresholds, in place
  // of a fabricated readability metric (see the file header's note). All
  // four map spec §5.6's "Microsoft-stated numbers" table onto the
  // corresponding native assertion.
  // ======================================================================

  // "Three to seven lines is about the right length for a paragraph."
  // DEVIATION #1: Recheck has no concept of a rendered "line" in Markdown —
  // line length depends on viewport/font, which is meaningless for a
  // structural check. `length`'s `sentences` unit is used as the closest
  // countable proxy for the guide's stated range; this is an intentional
  // substitution, not a literal reading of "lines".
  // DEVIATION #2: only the UPPER bound (7) ships; the lower bound (3) does
  // not. Discovered empirically while building this preset's own clean
  // fixture: single-sentence paragraphs are commonplace and entirely
  // correct in reference documentation (a one-line lead-in to a code
  // block, an image caption, a short introductory sentence before a list),
  // and a `min: 3` floor flagged more than a dozen ordinary, correct
  // paragraphs in a realistic API-documentation-shaped test file — the
  // same class of over-firing Google's own `list-length` rule avoided by
  // shipping only `min` with no `max` (spec: Google states no upper bound).
  // Shipping only `max: 7` here still enforces the guide's one genuinely
  // actionable direction (a paragraph that has grown too long to scan)
  // without penalizing normal short paragraphs. Both deviations are
  // recorded again in PROVENANCE.md.
  rules['microsoft/paragraph-length'] = {
    severity: 'warn',
    scope: 'paragraph',
    link: 'https://learn.microsoft.com/en-us/style-guide/scannable-content/',
    message:
      'Paragraph is %s %s long; Microsoft suggests at most 7 (sentences, as a proxy for lines).',
    assertions: { length: { unit: 'sentences', max: 7 } },
  };

  // "A list should have at least two items but (if possible) no more than
  // seven items." `warn`, matching the guide's own softened upper bound
  // ("if possible").
  rules['microsoft/list-length'] = tokenRule({
    name: 'list-length',
    message: 'List has %s item(s); Microsoft recommends 2-7 (Microsoft).',
    link: LISTS,
    options: { min: 2, max: 7 },
    severity: 'warn',
  });

  // "If a sentence contains more than a comma or two and ending
  // punctuation, consider rewriting it to make it crisp and clear."
  rules['microsoft/comma-density'] = {
    severity: 'warn',
    scope: 'sentence',
    link: 'https://learn.microsoft.com/en-us/style-guide/punctuation/',
    message: 'Sentence has %s commas; Microsoft suggests at most %s.',
    assertions: { occurrence: { pattern: ',', max: 2 } },
  };

  // ======================================================================
  // VOICE / CONTRACTIONS — `warn`.
  // ======================================================================

  // "Use contractions like it's, you'll, you're, we're, and let's." — the
  // signature Microsoft rule and the sharpest difference from other style
  // guides (spelled-out negative/pronoun forms -> contractions). Every pair
  // is a clean word-for-word verb contraction; `applyMatchCase` handles a
  // sentence-initial capitalized match correctly ("Do not" -> "Don't").
  rules['microsoft/use-contractions'] = swapRule({
    pairs: {
      cannot: "can't",
      'can not': "can't",
      'do not': "don't",
      'does not': "doesn't",
      'did not': "didn't",
      'is not': "isn't",
      'are not': "aren't",
      'was not': "wasn't",
      'were not': "weren't",
      'will not': "won't",
      'would not': "wouldn't",
      'should not': "shouldn't",
      'could not': "couldn't",
      'have not': "haven't",
      'has not': "hasn't",
      'had not': "hadn't",
      'it is': "it's",
      'you are': "you're",
      'we are': "we're",
      'they are': "they're",
      'you will': "you'll",
      'let us': "let's",
    },
    message: 'Microsoft style prefers the contraction "%s" over "%s".',
    link: USE_CONTRACTIONS,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "Avoid ambiguous or awkward contractions, such as there'd, it'll, and
  // they'd."
  rules['microsoft/no-awkward-contractions'] = patternRule({
    tokens: [
      "\\b(?:there['\u2019]d|it['\u2019]ll|they['\u2019]d|that['\u2019]ll|there['\u2019]ll)\\b",
    ],
    message: 'Avoid the ambiguous contraction "%s" (Microsoft).',
    link: USE_CONTRACTIONS,
    ignoreCase: true,
  });

  // "Don't mix contractions and their spelled-out equivalents in UI text...
  // don't use can't and cannot in the same UI." Textbook fit for
  // first-seen-wins `consistency`.
  rules['microsoft/contraction-consistency'] = {
    severity: 'warn',
    scope: 'summary',
    link: USE_CONTRACTIONS,
    message: '"%s" conflicts with the first-used form "%s" in this file (Microsoft).',
    assertions: {
      consistency: {
        ignoreCase: true,
        either: {
          "can't": 'cannot',
          "don't": 'do not',
          "won't": 'will not',
          "isn't": 'is not',
          "it's": 'it is',
        },
      },
    },
  };

  // "Avoid weak phrasing like there is, there are, and there were."
  rules['microsoft/no-weak-phrasing'] = patternRule({
    tokens: ['\\bthere (?:is|are|was|were)\\b'],
    message: 'Avoid weak phrasing such as "%s"; start the sentence with a verb (Microsoft).',
    link: TOP_10_TIPS,
    scope: ['paragraph', 'list-item'],
    ignoreCase: true,
  });

  // "Avoid please except in situations where the customer is asked to do
  // something inconvenient or the application or site is to blame."
  rules['microsoft/avoid-please'] = patternRule({
    tokens: ['\\bplease\\b'],
    message: 'Avoid "%s" except when asking the customer to do something inconvenient (Microsoft).',
    link: 'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/p/please',
    ignoreCase: true,
  });

  // ======================================================================
  // US SPELLING / LATIN ABBREVIATIONS / SIMPLE WORDS — `error` (mechanical,
  // unconditional, per the research's own "ship at error" framing).
  // ======================================================================

  // "use the US spelling. For example, use license, not licence." A subset
  // not already covered by recheck/prose's `consistency` rule
  // (behavior/color/license/organize).
  //
  // Each key below is one literal pair per inflection, never an alternation
  // group (`(s)?`, `(ed|ing)`, `(e|es|ed|ing|ation)`) mapped to a single
  // literal `swap` replacement. `swap` replacements are literal text, never
  // `$1` (see the file header's FIX SAFETY note), so an alternation group
  // would collapse every inflection it matches onto the one replacement the
  // config happens to name -- the exact hazard `az-verb-able`/
  // `az-case-only` exist to prevent, without ever writing `$1`:
  //   "The team is modelling the traffic pattern." -> "is modeled the"
  //     (modelling, an -ing form, would collapse onto the -ed replacement)
  //   "The job was cancelling when the timeout..." -> "was canceled when"
  //   "Both centres report the same latency."      -> "Both center report"
  //     (centres, plural, would collapse onto the singular replacement)
  //   "The request was authorised by the admin."   -> "was authorize by"
  //   "Authorisation happens before the redirect."  -> "Authorize happens"
  //   "Customisation of the theme is optional."     -> "Customize of the"
  // Enumerating one literal pair PER inflection gives one match shape, one
  // correct output. `favou?rite` needs the same discipline even though it
  // isn't an alternation group: the optional `u` would let the pattern
  // match the ALREADY-CORRECT "favorite" spelling too (a no-op "fix" that
  // still reports a false violation on correct text) -- narrowed to the UK
  // spelling only.
  //
  // "labeled"/"labeling" and "canceled"/"canceling" each need their own
  // pair: the guide names the -ing form explicitly ("Use one l, not two"
  // for labeled/labeling; "Spell canceled and canceling with one l" for
  // canceled/canceling), so a single-target replacement covering only the
  // -ed form would never produce "labeling"/"canceling" at all.
  //
  // `dialogue box` -> `dialog` is deliberately NOT repeated here:
  // `microsoft/dialog-terminology` already ships this exact pair as part
  // of its pop-up window/dialog box/dialogue box bundle, and a duplicate
  // here would double-report the same span from two different rule names
  // -- the same reasoning `az-grammar-usage`'s own comment documents for
  // `multi-factor`.
  //
  // `centred`/`centring` and `catalogued`/`cataloguing` need their own
  // pairs too: the noun/plural forms (`centre`/`centres`,
  // `catalogue`/`catalogues`) don't cover the verb inflections, and the
  // same one-inflection-per-pair principle above applies to verbs as much
  // as nouns.
  //
  // `centre`/`centres` and `catalogue`/`catalogues` themselves live in
  // `microsoft/us-spelling-detect` below, not here. Unlike the rest of this
  // rule, these four are real ORGANIZATION/PLACE names in their OWN
  // official spelling, not just a British/American variant of an ordinary
  // word: "Centre County, Pennsylvania" is a real US county whose official
  // name keeps the British "re" spelling, and "Bell Centre" (Montreal
  // Canadiens' arena) is officially spelled with "Centre", not "Center" --
  // fixing either would silently rewrite a proper noun's own spelling
  // ("...held at the Bell Centre" -> "...held at the Bell Center"). Same
  // shape for "Catalogue of Life" (a real, commonly-cited global species
  // database whose own name is spelled with the British "ue"). The VERB
  // inflections (`centred`/`centring`, `catalogued`/`cataloguing`) don't
  // carry this risk -- a participle doesn't head a proper noun the way the
  // bare noun does -- and stay fixable here.
  rules['microsoft/us-spelling'] = swapRule({
    pairs: {
      '\\bcentred\\b': 'centered',
      '\\bcentring\\b': 'centering',
      '\\bcatalogued\\b': 'cataloged',
      '\\bcataloguing\\b': 'cataloging',
      '\\bcancelled\\b': 'canceled',
      '\\bcancelling\\b': 'canceling',
      '\\bfavourite\\b': 'favorite',
      '\\bauthorise\\b': 'authorize',
      '\\bauthorises\\b': 'authorizes',
      '\\bauthorised\\b': 'authorized',
      '\\bauthorising\\b': 'authorizing',
      '\\bauthorisation\\b': 'authorization',
      '\\bcustomise\\b': 'customize',
      '\\bcustomises\\b': 'customizes',
      '\\bcustomised\\b': 'customized',
      '\\bcustomising\\b': 'customizing',
      '\\bcustomisation\\b': 'customization',
      '\\blabelled\\b': 'labeled',
      '\\blabelling\\b': 'labeling',
      '\\bmodelled\\b': 'modeled',
      '\\bmodelling\\b': 'modeling',
    },
    message: 'Use the US spelling "%s" instead of "%s" (Microsoft).',
    link: USE_US_SPELLING,
    severity: 'error',
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // Detection-only sibling: same US-spelling guidance, but the avoid-term
  // is ALSO a real proper noun's own official spelling (see the comment on
  // `microsoft/us-spelling` above) -- "Bell Centre", "Centre County,
  // Pennsylvania", and "Catalogue of Life" all keep the British spelling
  // this rule would otherwise "fix". Severity stays `error`, matching Tier
  // 3's unconditional framing: the GUIDANCE is still always correct, only
  // the auto-fix is unsafe.
  rules['microsoft/us-spelling-detect'] = swapRule({
    pairs: {
      '\\bcentre\\b': 'center',
      '\\bcentres\\b': 'centers',
      '\\bcatalogue\\b': 'catalog',
      '\\bcatalogues\\b': 'catalogs',
    },
    message: 'Use the US spelling "%s" instead of "%s" (Microsoft).',
    link: USE_US_SPELLING,
    severity: 'error',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // "Avoid Latin abbreviations for common English phrases." `e.g.`/`i.e.`
  // keep the leading-\b-only anchoring recheck/google's `no-latinisms`
  // established (a trailing \b right after a period-then-space never
  // matches); `ergo` ends in a word character, so it keeps a normal
  // trailing \b too (this is what stops `ergo` from matching inside
  // "ergonomic"). `via` is deliberately dropped: it is not named as an
  // example to avoid on any fetched page, and Microsoft's own prose uses
  // it (see PROVENANCE.md's contradictions note).
  //
  // `de facto`, `ad hoc`, and `vis-a-vis` live in
  // `microsoft/no-latin-abbreviations-detect` below, not here. The live
  // use-us-spelling page's ONLY sentence covering them is "Avoid
  // non-English words or phrases, such as de facto or ad hoc" — an example
  // list of terms to avoid, with NO replacement word stated for either
  // one, and "vis-a-vis" isn't named on this page (or any fetched page) at
  // all. `e.g./i.e./viz./ergo`, by contrast, come from this same page's own
  // "Use this / Instead of this" TABLE, which gives each an exact
  // single-word target; a stated replacement like "in practice"/"as
  // needed"/"compared with" for the other three would just be a guess, not
  // Microsoft's prescribed text.
  //
  // e.g./i.e./viz./ergo are Latin ABBREVIATIONS translated into a
  // different English phrase -- not a respelling of the same word
  // (contrast "vs." -> "versus" below, which shares the same letters as
  // the word it abbreviates), so these ship detection-only.
  rules['microsoft/no-latin-abbreviations'] = swapRule({
    pairs: {
      '\\be\\.g\\.,?': 'for example',
      '\\bi\\.e\\.,?': 'that is',
      '\\bviz\\.': 'namely',
      '\\bergo\\b': 'therefore',
    },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: USE_US_SPELLING,
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    wordBoundary: false,
    keysAreRegex: true,
  });

  rules['microsoft/no-latin-abbreviations-detect'] = patternRule({
    tokens: ['\\bde facto\\b', '\\bad hoc\\b', '\\bvis-[\u00e0a]-vis\\b'],
    message:
      'Microsoft style: avoid the non-English phrase "%s" — no single replacement is prescribed; rewrite for the context (Microsoft).',
    link: USE_US_SPELLING,
    severity: 'error',
    ignoreCase: true,
  });

  // "Choose simple verbs without modifiers." / "Don't use two or three
  // words when one will do."
  //
  // `in addition` is anchored against a following "to" that turns it into
  // the standard, grammatically necessary preposition phrase "in addition
  // to X" -- the guide's objection targets the STAND-ALONE transitional
  // adverb ("In addition, configure the timeout"), which "also" replaces
  // cleanly; "also to X" is not grammatical ("In addition to the API key,
  // you need a secret" -> "Also to the API key, you need a secret").
  // Every pair here substitutes a DIFFERENT word/phrase for the avoid-term
  // (not a respelling), so this ships detection-only.
  rules['microsoft/simple-words'] = swapRule({
    pairs: {
      '\\butilize\\b': 'use',
      '\\butilise\\b': 'use',
      '\\bmake use of\\b': 'use',
      '\\bin order to\\b': 'to',
      '\\bas a means to\\b': 'to',
      '\\bin addition\\b(?!\\s+to\\b)': 'also',
      '\\bestablish connectivity\\b': 'connect',
      '\\binform\\b': 'tell',
    },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: USE_SIMPLE_WORDS,
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // "using leverage to mean take advantage of" (avoid-jargon); confirmed
  // again on the A-Z leverage entry. Kept as its own rule so its `link:`
  // points at the page that actually states it, rather than reusing
  // use-simple-words' citation for a rule it doesn't cover.
  //
  // `fix: false`: the live a-z/leverage page's full text is "Don't use as a
  // VERB to mean take advantage of. Use take advantage of, use, or another
  // more appropriate word or phrase" — sense-scoped (verb only) AND
  // multiple-alternatives, neither of which a bare-word swap can encode.
  // "leverage" and "leveraged" are also common, correct NOUN/ADJECTIVE
  // forms with an unrelated meaning this page never addresses ("financial
  // leverage", "a highly leveraged company", "a leveraged buyout") — a
  // blind fix corrupts every one of those into "financial use"/"a highly
  // used company"/"a used buyout". Unlike `impact-verb`, there's no small
  // enumerable set of following objects to anchor on (the verb takes
  // almost any direct object: "leverage the API/your data/existing
  // infrastructure/..."), so detection-only is the right fallback here,
  // not a partial anchor.
  rules['microsoft/leverage'] = swapRule({
    pairs: { leverage: 'use', leveraging: 'using', leveraged: 'used' },
    message:
      'Rewrite "%s" using "%s" (Microsoft): only the VERB sense ("leverage the API") is targeted — "leverage"/"leveraged" are also common, correct nouns/adjectives ("financial leverage", "a leveraged buyout") a blind substitution would corrupt.',
    link: AVOID_JARGON,
    severity: 'error',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "such as symbol instead of glyph" (avoid-jargon).
  //
  // `fix: false`: the live a-z/glyph page carries a carve-out a bare swap
  // can't encode: "Don't use to refer generically to a graphic or
  // pictorial image on a button, on an icon, or in a message box. Use
  // symbol instead. It's OK to use glyph in a technical discussion of
  // fonts and characters." Font/Unicode documentation — plausible in
  // Redocly's own developer-audience docs — uses "glyph" as a precise
  // technical term distinct from "symbol" (the visual rendering of a
  // character within a specific font); no position anchor distinguishes
  // "technical discussion of fonts" from the generic-icon sense the guide
  // actually objects to, matching the same developer-audience-carve-out
  // class already excluded for `header`/`disk`/`directory`/`context menu`.
  rules['microsoft/glyph'] = swapRule({
    pairs: { glyph: 'symbol' },
    message:
      'Use "%s" instead of "%s" (Microsoft) when referring generically to a UI icon/image — but it\'s OK to use "glyph" in a technical discussion of fonts and characters.',
    link: AVOID_JARGON,
    severity: 'error',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "Don't create a new word from an existing word" -- bucketize -> group.
  // Different word, not a respelling -- detection-only.
  rules['microsoft/bucketize'] = swapRule({
    pairs: { bucketize: 'group' },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: DONT_USE_COMMON_WORDS,
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "Don't use verbs as nouns or nouns as verbs" -- narrowly anchored to
  // the verb sense with a direct object, since "impact" is also a common,
  // correct noun ("the impact of this change") that must not be rewritten.
  rules['microsoft/impact-verb'] = patternRule({
    tokens: [
      '\\bimpact(?:s|ed|ing)?\\s+(?:performance|productivity|quality|reliability|availability|latency|throughput)\\b',
    ],
    message: 'Use "affect" instead of "impact" as a verb (Microsoft): "%s"',
    link: DONT_USE_COMMON_WORDS,
  });

  // "the ask" is a bid/ask-market homograph: unscoped, this pair corrupts
  // "Traders watched the ask tick higher" into "...watched the request
  // tick higher". Detection-only. The pattern below is also scoped against
  // that same bid/ask market sense so the clean fixture doesn't visibly
  // misfire on it -- a false positive a user would call silly is still
  // worth avoiding, even on a detection-only rule.
  rules['microsoft/the-ask'] = swapRule({
    pairs: {
      '\\bthe ask\\b(?!\\s+(?:tick|ticks|price|prices|spread|spreads|size|quote|quotes)\\b)':
        'the request',
    },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: DONT_USE_COMMON_WORDS,
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // ======================================================================
  // BIAS-FREE / MILITARISTIC / DEROGATORY LANGUAGE — `error` (sensitive
  // category; matches the accessibility-terms severity below).
  // ======================================================================

  // Every pair here substitutes a DIFFERENT word/phrase, not a respelling
  // -- `DMZ` is the paradigm case: unscoped, this pair corrupts "Tensions
  // remain high near the DMZ dividing North and South Korea" into
  // "...near the perimeter network dividing...". Severity stays `error`
  // (sensitive-category carve-out, matching `master-slave`/
  // `no-derogatory-slang`/`accessibility-terms`/
  // `racial-ethnic-capitalization`, all of which are also detection-only at
  // `error`) -- only `fix` changes. `DMZ` is also scoped against that same
  // Korean-border sense so the clean fixture doesn't visibly misfire on
  // it -- worth avoiding as noise even on a detection-only rule.
  rules['microsoft/bias-free-terms'] = swapRule({
    pairs: {
      chairman: 'chair',
      chairwoman: 'chair',
      mankind: 'humanity',
      manmade: 'synthetic',
      'man-made': 'synthetic',
      manpower: 'workforce',
      salesman: 'sales representative',
      salesmen: 'sales representatives',
      'demilitarized zone': 'perimeter network',
      '\\bDMZ\\b(?!\\s+(?:dividing|between|separating)\\b)': 'perimeter network',
      'screened subnet': 'perimeter network',
    },
    message: 'Use "%s" instead of "%s" (Microsoft: bias-free communication).',
    link: BIAS_FREE,
    severity: 'error',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: true,
  });

  // `master/slave` ships detection-only rather than in neither direction:
  // both live pages agree the TERM itself must be avoided; they disagree
  // only on the REPLACEMENT: bias-free-communication's table gives
  // "primary/subordinate", while the
  // dedicated a-z/master-slave page leads with "primary/replica" (also
  // sanctioning primary/secondary, principal/agent, controller/worker) and
  // separately rejects "primary/subordinate" as a synonym for parent/child
  // specifically (not wholesale — see PROVENANCE.md). Shipping NOTHING would
  // silently permit `master/slave` in a preset with an inclusive-language
  // mandate; shipping ONE side would guess which of the two pages the guide
  // actually intends. `pattern`, not `swap`, sidesteps the choice entirely:
  // no replacement is prescribed, so there is no wrong-target pairing to
  // ship, and the message names both candidates so a human picks the one
  // that fits.
  rules['microsoft/master-slave'] = patternRule({
    tokens: ['\\bmaster\\s*/\\s*slave\\b', '\\bmaster-slave\\b'],
    message:
      'Avoid "%s" (Microsoft): the guide\'s two pages disagree on the replacement — use "primary/subordinate" (bias-free-communication) or "primary/replica" (also acceptable: primary/secondary, principal/agent, controller/worker; a-z/master-slave) depending on context.',
    link: MASTER_SLAVE,
    severity: 'error',
    ignoreCase: true,
  });

  // "add cyber- in front of threat so it reads cyberthreat, all one word
  // no space no hyphen" -- the spelling normalization only; the guide's
  // separate "needs a qualifier in front of it" test is not mechanically
  // decidable and is not enforced here.
  rules['microsoft/cyberattack-spelling'] = swapRule({
    pairs: {
      'cyber attack': 'cyberattack',
      'cyber-attack': 'cyberattack',
      'cyber threat': 'cyberthreat',
      'cyber-threat': 'cyberthreat',
    },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: MILITARISTIC_LANGUAGE,
    severity: 'error',
    ignoreCase: true,
    wordBoundary: true,
  });

  // "Don't use profane or derogatory terms, such as pimp or bitch." /
  // "Don't use slang... such as spirit animal." Detection-only: no safe
  // fixed replacement exists for any of these.
  rules['microsoft/no-derogatory-slang'] = patternRule({
    tokens: ['\\bpimp\\b', '\\bbitch\\b', '\\bspirit animal\\b'],
    message: 'Avoid the derogatory or culturally appropriative term "%s" (Microsoft).',
    link: BIAS_FREE,
    severity: 'error',
    ignoreCase: true,
  });

  // "Use title-style capitalization for Asian, Black and African American,
  // Hispanic and Latinx, ..." Case-sensitive (`ignoreCase: false`): only
  // the genuinely-lowercase form is flagged, so already-correct title-style
  // text is never touched. `white`/`multiracial` (which the guide says to
  // LOWERCASE) are deliberately excluded: a bare capitalized "White" collides
  // constantly with unrelated proper nouns (White House, White Paper, brand
  // names) and would be far noisier than valuable.
  rules['microsoft/racial-ethnic-capitalization'] = swapRule({
    pairs: {
      asian: 'Asian',
      'black and african american': 'Black and African American',
      'hispanic and latinx': 'Hispanic and Latinx',
      'native american': 'Native American',
      'alaska native': 'Alaska Native',
      'native hawaiian': 'Native Hawaiian',
      'pacific islander': 'Pacific Islander',
      'indigenous peoples': 'Indigenous Peoples',
    },
    message: 'Use title-style capitalization: "%s" instead of "%s" (Microsoft).',
    link: BIAS_FREE,
    severity: 'error',
    ignoreCase: false,
    wordBoundary: true,
  });

  // ======================================================================
  // ACCESSIBILITY TERM COLLECTION (Tier 2) — `error`. Detection-only by
  // design, not merely by caution: the research draft crossed two of the
  // live table's rows (mapping "handicapped" and "differently abled" to
  // the WRONG row's replacement) and fabricated a third avoid-phrase
  // ("afflicted with", which appears nowhere on the live page). Shipping
  // `pattern`, not `swap`, for the whole category sidesteps that risk
  // entirely: every avoid-term below is independently confirmed as a term
  // to avoid, but no specific replacement is prescribed, so there is no
  // wrong-target pairing to ship.
  //
  // This rule covers the COMPLETE, independently re-verified 11-row
  // accessibility-terms table, extracted per-`<tr>` so a term can never end
  // up paired with another row's replacement text (the row-crossing defect
  // the section header above describes). The table has 11 rows, not 10 —
  // Rows 8 and 10 both list "special needs" mapped to two DIFFERENT
  // preferred replacements (a genuine self-contradiction on Microsoft's own
  // page). Both terms below still resolve to the SAME already-shipped
  // `special needs` token either way, so the duplicate row doesn't affect
  // what ships — see PROVENANCE.md's "Tier 2 design" section.
  //
  // Every new term below stays in this SAME pattern rule (no swap target
  // prescribed for any of them), split into two groups purely for
  // documentation clarity — both groups are equally detection-only:
  //   - "Normal" (specific, low collision risk): sight-impaired,
  //     vision-impaired, hearing-impaired, non-verbal, maimed, missing a
  //     limb, birth defect, Special Ed person, normal person/healthy
  //     person (phrase-level, NOT bare "normal" — see below), Asperger's
  //     (both the verified straight U+0027 apostrophe and the curly
  //     U+2019 form, since a curly one would not match a straight-only
  //     pattern).
  //   - "Needs a human, not a substitution" (shipped anyway, scope-guarded
  //     where a real collision exists): `dumb`/`mute` (Row 3's own only
  //     avoid-terms, no Acceptable-column alternative exists for this row
  //     at all); `lame`/`stupid` (Rows 2/8 — general-purpose pejoratives
  //     with heavy ordinary usage; flagging is legitimate guidance,
  //     auto-rewriting would not be, and this IS pattern-only so there is
  //     no auto-rewrite -- a flag is a much smaller cost than a swap would
  //     be); `an epileptic` (Row 4 — the guide's own replacement is
  //     a condition-specific sentence rewrite, "has multiple sclerosis,
  //     cerebral palsy, a seizure disorder, or muscular dystrophy", not a
  //     term a `pattern` or `swap` rule can respell — flagging it at least
  //     tells a human to rewrite the sentence).
  //
  // TECHNICAL-MEANING COLLISIONS, scope-limited rather than shipped bare:
  //   - `mute` has an extremely common, entirely correct, unrelated
  //     technical sense as an audio/UI control ("mute the microphone",
  //     "mute notifications", a mute button/icon) — a preset that rewrites
  //     "mute the audio track" would be worse than one that stays quiet,
  //     and even flagging it is only worth doing where the disability
  //     sense is actually likely. Scoped to predicate-adjective and
  //     compound forms ("is/was/are/were/being/been mute", "deaf and
  //     mute", "deaf-mute") — the shapes the guide's own usage and real
  //     ableist writing take — rather than the bare word, which would
  //     also match every "mute the audio"/"put the call on mute"/"mute
  //     button" UI phrasing.
  //   - `normal` (as part of "normal person"/"healthy person") is matched
  //     as the guide's own two/three-word PHRASE, never the bare word —
  //     this is deliberate, not an oversight: bare `\bnormal\b` would also
  //     match a statistical "normal distribution" or "normalize a value",
  //     senses the guide never addresses. The phrase-level match is
  //     unlikely to ever collide with those senses.
  // Both collisions are also documented in PROVENANCE.md's Tier 2 section.
  rules['microsoft/accessibility-terms'] = patternRule({
    tokens: [
      // -- already shipped (Rows 2, 7, 8 in the re-verified table) --------
      '\\bcrippled\\b',
      '\\bhandicapped\\b',
      '\\bthe handicapped\\b',
      '\\bpeople with handicaps\\b',
      '\\bslow learner\\b',
      '\\bmentally handicapped\\b',
      '\\bdifferently abled\\b',
      '\\bspecial needs\\b',
      '\\baffected by\\b',
      '\\bstricken with\\b',
      '\\bsuffers from\\b',
      '\\ba victim of\\b',
      // -- Specific, low collision risk ----------------------------------
      '\\bsight-impaired\\b', // Row 0
      '\\bvision-impaired\\b', // Row 0 (same row/replacement as sight-impaired)
      '\\bhearing-impaired\\b', // Row 1
      '\\bnon-verbal\\b', // Row 3
      '\\bmaimed\\b', // Row 6
      '\\bmissing a limb\\b', // Row 6
      '\\bbirth defect\\b', // Row 6
      '\\bSpecial Ed person\\b', // Row 8 (ignoreCase below; not "special needs" itself)
      '\\bnormal person\\b', // Row 5 — phrase-level, see collision note above
      '\\bhealthy person\\b', // Row 5 — phrase-level, see collision note above
      "\\bAsperger['\u2019]s\\b", // Row 9 — straight (U+0027) AND curly (U+2019)
      // -- Needs a human, shipped detection-only anyway ------------------
      '\\bdumb\\b', // Row 3
      '\\b(?:is|was|are|were|being|been)\\s+mute\\b', // Row 3, scope-guarded (see above)
      '\\bdeaf and mute\\b', // Row 3, scope-guarded (see above)
      '\\bdeaf-mute\\b', // Row 3, scope-guarded (see above)
      '\\blame\\b', // Row 2
      '\\bstupid\\b', // Row 8
      // Row 4. Guarded against "an epileptic seizure/episode/fit/attack" --
      // legitimate medical usage where "epileptic" is an adjective
      // describing the EVENT, not the guide's objection (calling a PERSON
      // "an epileptic" instead of "a person with... a seizure disorder").
      '\\ban epileptic\\b(?!\\s+(?:seizure|episode|fit|attack|event))',
    ],
    message:
      'Use people-first language instead of "%s" — see the accessibility term collection (Microsoft).',
    link: ACCESSIBILITY_TERMS,
    severity: 'error',
    ignoreCase: true,
  });

  // ======================================================================
  // SPELLING AND HYPHENATION NORMALIZATION (Tier 3) — `error` (pure
  // mechanics, per the research's own framing).
  // ======================================================================

  rules['microsoft/spelling-hyphenation'] = swapRule({
    pairs: {
      '\\be-?mail\\b(?<!email)': 'email',
      '\\bdata ?base\\b(?<!database)': 'database',
      '\\bend ?point\\b(?<!endpoint)': 'endpoint',
      '\\bweb ?site\\b(?<!website)': 'website',
      '\\bweb ?page\\b(?<!webpage)': 'webpage',
      '\\bwork ?station\\b(?<!workstation)': 'workstation',
      '\\bscreen ?shot\\b(?<!screenshot)': 'screenshot',
      '\\btask ?bar\\b(?<!taskbar)': 'taskbar',
      '\\bname ?space\\b(?<!namespace)': 'namespace',
      '\\bplug-in\\b': 'plugin',
      '\\becommerce\\b': 'e-commerce',
      '\\belearning\\b': 'e-learning',
      '\\bebook\\b': 'e-book',
      '\\bcyber-security\\b': 'cybersecurity',
      '\\bco-author\\b': 'coauthor',
      // "dial up"/"single sign on" don't need a `(?<!...)` guard the way
      // the closed-compound patterns above do: the CORRECT spelling for
      // both ("dial-up", "single sign-on") is HYPHENATED, and the ` ?`
      // (optional space, not optional hyphen) in these two patterns cannot
      // match a hyphen at all — the correct form structurally never
      // matches the pattern, so there is nothing to exclude.
      '\\bdial ?up\\b': 'dial-up',
      '\\bread only\\b': 'read-only',
      '\\bcontext sensitive\\b': 'context-sensitive',
      '\\bsingle sign ?on\\b': 'single sign-on',
      '\\bmulti-factor\\b': 'multifactor',
      '\\bmulti-cloud\\b': 'multicloud',
      '\\bmulti-tenant\\b': 'multitenant',
      '\\bwell-being\\b': 'wellbeing',
      '\\btool ?tip\\b(?<!tooltip)': 'tooltip',
      // Lives here rather than in `az-lifecycle-verbs`: `imbed` is a
      // recognized non-standard/alternate spelling of `embed` (same word,
      // no demonstrated unrelated sense), matching this rule's theme.
      '\\bimbed\\b': 'embed',
    },
    message: 'Microsoft style spells this "%s", not "%s".',
    link: AZ_BASE + 'e/email',
    severity: 'error',
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // "The term tooltip is one word and lowercase. Don't spell it as
  // ToolTip." Shipped as its OWN case-SENSITIVE rule (not folded into
  // `spelling-hyphenation`'s `ignoreCase: true` pattern, which is exactly
  // the config-mechanics bug task-10-verify-H.md found: a shared
  // `ignoreCase: true` flag makes a same-rule "ToolTip"-only pattern also
  // match the already-correct lowercase "tooltip"). "ToolTip"'s internal
  // mixed casing doesn't match `applyMatchCase`'s simple
  // ALL-CAPS/Capitalized heuristics, so the configured lowercase
  // replacement is inserted as authored, not case-shouted.
  rules['microsoft/tooltip-capitalization'] = swapRule({
    pairs: { ToolTip: 'tooltip' },
    message: 'Use "%s", not "%s" (Microsoft: tooltip is one word, lowercase).',
    link: AZ_BASE + 't/tooltip',
    severity: 'error',
    ignoreCase: false,
    wordBoundary: true,
  });

  // ======================================================================
  // CASE-ONLY (`fix: false`) — replacement differs from the avoid-term
  // only by case; `applyMatchCase` would silently no-op the fix.
  //
  // Not every case-differing pair is a silent `applyMatchCase` no-op: a
  // replacement whose internal casing has a second capital letter past the
  // first (e.g. "DevOps"/"JavaScript"), or is a completely different word
  // ("web"), doesn't match `applyMatchCase`'s Capitalized/ALL-CAPS
  // heuristics, so the configured replacement is inserted as authored
  // rather than reproducing the match -- a REAL, correct fix. Those pairs
  // (`Big Data`, `Dark Mode`, `darkmode`, `Devops`, `devops`, `bluetooth`,
  // `boolean`, `Javascript`, `javascript`, `World Wide Web`) ship fixable in
  // `microsoft/az-case-fixable` below instead of reporting forever for no
  // reason. Only the genuine no-ops — where match and replacement are the
  // identical string in two different single-word casings
  // (`Internet`/`internet`, `WWW`/`www`, ...) — stay here.
  // ======================================================================

  rules['microsoft/az-case-only'] = swapRule({
    pairs: {
      Internet: 'internet',
      Intranet: 'intranet',
      Extranet: 'extranet',
      Euro: 'euro',
      WWW: 'www',
      Registry: 'registry',
      Spam: 'spam',
    },
    message: 'Use "%s" instead of "%s" (Microsoft): rewrite, this fix would silently no-op.',
    link: AZ_BASE + 'i/internet-intranet-extranet',
    severity: 'error',
    fix: false,
    ignoreCase: false,
    wordBoundary: true,
  });

  // `World Wide Web` -> `web` lives in `microsoft/world-wide-web` below,
  // not here -- it's a different, shorter name, not a casing/spacing
  // variant of the same three words the way every other pair here is (all
  // empirically verified against the live `applyMatchCase` to produce a
  // real, correct fix, not a no-op: with `ignoreCase: false`, an ALL-CAPS
  // input like "DEVOPS"/"JAVASCRIPT" can never match these case-sensitive
  // keys in the first place, so the ALL-CAPS-shout no-op class
  // `az-case-only` exists to avoid doesn't recur here).
  //
  // `boolean` -> `Boolean` lives in `microsoft/az-case-fixable-detect`
  // below instead: unlike the rest of this rule, it carries an unrelated
  // legitimate sense, not just a same-word casing difference. Lowercase
  // `boolean` is the REQUIRED, spec-mandated spelling of
  // the OpenAPI/JSON Schema type name (`"type": "boolean"`) -- exactly
  // Redocly's own domain -- and prose describing a schema ("the field is a
  // boolean") uses the correct lowercase form constantly. Auto-capitalizing
  // every lowercase "boolean" would corrupt this extremely common,
  // completely correct technical usage. Detection is still useful for
  // ordinary prose review; auto-fix is not safe.
  rules['microsoft/az-case-fixable'] = swapRule({
    pairs: {
      'Big Data': 'big data',
      'Dark Mode': 'dark mode',
      darkmode: 'dark mode',
      Devops: 'DevOps',
      devops: 'DevOps',
      bluetooth: 'Bluetooth',
      Javascript: 'JavaScript',
      javascript: 'JavaScript',
    },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: AZ_BASE + 'i/internet-intranet-extranet',
    severity: 'error',
    ignoreCase: false,
    wordBoundary: true,
  });

  rules['microsoft/az-case-fixable-detect'] = swapRule({
    pairs: {
      boolean: 'Boolean',
    },
    message:
      'Use "%s" instead of "%s" (Microsoft) in ordinary prose -- but lowercase "boolean" is correct and expected when naming the OpenAPI/JSON Schema type.',
    link: AZ_BASE + 'i/internet-intranet-extranet',
    severity: 'error',
    fix: false,
    ignoreCase: false,
    wordBoundary: true,
  });

  rules['microsoft/world-wide-web'] = swapRule({
    pairs: { 'World Wide Web': 'web' },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: AZ_BASE + 'i/internet-intranet-extranet',
    severity: 'warn',
    fix: false,
    ignoreCase: false,
    wordBoundary: true,
  });

  // ======================================================================
  // VERB-ABLE (`fix: false`, message says "rewrite") — the replacement is
  // a noun phrase, but the avoid-term is documented as also usable as a
  // verb ("whitelist an email address"); a blind fix produces ungrammatical
  // output ("allow list an email address").
  // ======================================================================

  rules['microsoft/az-verb-able'] = swapRule({
    pairs: {
      blacklist: 'block list',
      whitelist: 'allow list',
      allowlist: 'allow list',
      blocklist: 'block list',
    },
    message: 'Rewrite "%s" using "%s" (Microsoft): a direct substitution may be ungrammatical.',
    link: AZ_BASE + 'b/blacklist',
    severity: 'error',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // ======================================================================
  // A-Z WORD LIST (Tier 1) — one-to-one substitutions, grouped thematically.
  // `error`, matching the research's "ship at error" framing. Every
  // Tier-4 (audience/UI-conditional) entry, every developer-audience
  // carve-out relevant to Redocly, and every entry with an unresolved
  // substring/homograph collision risk is excluded — see the file header
  // and PROVENANCE.md's "Excluded candidates" table.
  //
  // Not every candidate pair is CONFIRMED unconditional: pairs carrying a
  // conditional, multi-target, or detect-only guidance shape live in a
  // `*-detect` pattern sibling instead (conditional/multi-target: `quit`,
  // `deinstall`, `reinitialize`, `crash`, `lock up`, `bottom left`/
  // `bottom right`, `thank you`, `hierarchical menu`/`secondary menu`,
  // `running head`/`running foot`, `pound sign`), ship `fix: false`
  // (detect-only but still a single-target swap: `left-hand`/`right-hand`),
  // or are dropped outright where the guide's own carve-out is a genuine
  // meaning change in Redocly's own domain (`terminate`), or excluded as a
  // low-priority general-audience-only nuance that doesn't change what
  // ships (`indices` is excluded per its own TOO-RISKY reasoning above;
  // `backbone`/`natural user interface` already ship as `pattern`, i.e.
  // already detection-only, in `microsoft/az-no-replacement`). Every OTHER
  // pair below is CONFIRMED unconditional.
  // ======================================================================

  // `crash` and `lock up` live in `microsoft/az-state-failure-detect`
  // below, not here, for two independent reasons: (1) noun-compound
  // collision — an unscoped "crash" swap rewrites "Attach the crash dump"
  // (a diagnostic file, not a verb) into "Attach the fail dump"; (2) the
  // guide gives a HARDWARE/SOFTWARE split target ("Use fail for disks or
  // other hardware, or stop responding for programs") that a single
  // literal `swap` replacement can't express — the same one-match-
  // shape/one-output principle `us-spelling` above follows. `hang`/`hangs`
  // keep a single target ("stop(s) responding") but are anchored against
  // the unrelated phrasal-verb idioms "hang on/up/around/out/together"
  // (retain, end a call, loiter), none of which describe a system that
  // stopped responding.
  //
  // The live h/hang page's quote is itself scoped to "a situation in which
  // a program encounters a problem and can't close itself" — it says
  // nothing about "hang" the ordinary English word, which has a long tail
  // of idioms/senses beyond the phrasal verbs above: "get the hang of it"
  // (a knack, not a system), "hang in there"/"hang tight"/"hang loose"/
  // "hang fire" (encouragement/waiting idioms), and the literal sense ("the
  // picture hangs from the ceiling"). The exclusion list also covers "of"
  // (the idiom's own preposition), "in", "tight", "loose", "fire", plus
  // "from"/"over" for the literal-suspension sense — not exhaustive
  // ("hang" is an ordinary word with many senses, the same breadth
  // `crash`/`lock up` are detection-only for), but it closes the specific
  // gap a plausible Redocly onboarding sentence ("Once you get the hang of
  // the API...") would otherwise hit.
  //
  // "hang" itself ships detection-only (not just anchored): "hang by a
  // thread", "hang back", "hang in there"/"hang tight"/"hang loose"/"hang
  // fire", "get the hang of it", the literal suspension sense ("hangs from
  // the ceiling") are an open-ended tail of idioms no anchor list
  // converges on. Severity follows fixability (`error` -> `warn`,
  // word-choice not structural).
  rules['microsoft/az-state-failure'] = swapRule({
    pairs: {
      '\\bhangs\\b(?!\\s+(?:on|up|around|out|together|of|in|tight|loose|fire|from|over)\\b)':
        'stops responding',
      '\\bhang\\b(?!\\s+(?:on|up|around|out|together|of|in|tight|loose|fire|from|over)\\b)':
        'stop responding',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'h/hang',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // Detection-only sibling of the rule above: `crash` and `lock up` both
  // carry a hardware-vs-software multi-target split a single `swap`
  // replacement can't express, so this ships as `pattern` (no fixed
  // target at all — the same discipline `microsoft/accessibility-terms`
  // uses for its own multi-target/crossed-row risk) rather than guessing
  // which of the two applies. `crash` is anchored against the noun
  // compounds ("crash dump/report/log/course/test/site") a bare match
  // would otherwise flag on entirely correct technical prose.
  rules['microsoft/az-state-failure-detect'] = patternRule({
    tokens: ['\\bcrash\\b(?!\\s+(?:dump|report|log|course|test|site)\\b)', '\\block up\\b'],
    message:
      'Microsoft style: "%s" needs a context-specific replacement (fail for hardware, stop responding for programs).',
    link: AZ_BASE + 'c/crash',
    severity: 'error',
    ignoreCase: true,
  });

  // `terminate` is dropped entirely (not just anchored) — "Terminate the
  // instance/process/session/connection" is standard, correct
  // cloud-infrastructure vocabulary throughout Redocly's own
  // API-documentation domain (a genuine meaning change, not a false match:
  // the guide's sense is "close an app or window"), and no reliable
  // positional anchor separates that sense from the guide's UI sense the
  // way `exit`'s determiner-based anchor below does — see PROVENANCE.md's
  // "Excluded candidates" table. `quit`, `deinstall`, and `reinitialize`
  // live in `microsoft/az-lifecycle-verbs-detect` below instead: the guide
  // gives `quit` FOUR distinct replacements depending on meaning (not a
  // single swap), and marks `deinstall` and `reinitialize` conditional.
  // `exit`, `launch`, and `boot` stay fixable, anchored to exclude the noun
  // compounds/senses that would otherwise corrupt them: "exit code", "the
  // product launch", "boot disk" (verb position requires a following
  // object article, or excludes trailing/leading noun-compound words) —
  // the same anchoring technique `microsoft/no-click` uses for `click`,
  // extended from character lookaround to word lookaround.
  //
  // `imbed` -> `embed` is a same-word spelling variant (it lives in
  // `microsoft/spelling-hyphenation`, Tier 3, where it belongs
  // thematically, not here). Every OTHER pair here substitutes a DIFFERENT
  // word for the avoid-term (not a respelling) -- `exit`/`launch`/`boot`
  // are exactly the shape already anchored against noun-compound
  // collisions above, which is itself evidence they carry real homograph
  // risk, not proof a blind swap is safe. Detection-only; severity follows
  // fixability.
  rules['microsoft/az-lifecycle-verbs'] = swapRule({
    pairs: {
      '\\bcarry out\\b': 'run',
      '(?<!\\b(?:the|an|no|emergency)\\s)\\bexit\\b(?!\\s+(?:code|status|button|sign|strategy|interview|poll|ramp|velocity|row)\\b)':
        'close',
      '(?<!\\b(?:product|software|game|website|app|feature|rocket|mission)\\s)\\blaunch\\b(?!\\s+(?:date|event|party|window|site|pad|day|plan|schedule|announcement)\\b)':
        'open',
      '\\bboot\\b(?!\\s+(?:disk|sector|loader|sequence|process|time|options?|record|partition|menu|order|camera)\\b)':
        'turn on',
      '\\bundelete\\b': 'restore',
      '\\binstantiate\\b': 'create an instance of',
      '\\biconize\\b': 'minimize',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'b/boot',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // Detection-only sibling: `quit` (multi-target), `deinstall`, and
  // `reinitialize` (both conditional, sharing the identical "if the UI or
  // API uses [it] in a label" carve-out already excluded for their sibling
  // `reboot` — see the file header's Tier-4 section). None of these have a
  // homograph/noun-compound collision risk the way `exit`/`launch`/`boot`
  // do; they're detection-only for a confirmation-strength reason, not a
  // corruption risk.
  rules['microsoft/az-lifecycle-verbs-detect'] = patternRule({
    tokens: ['\\bquit\\b', '\\bdeinstall\\b', '\\breinitialize\\b'],
    message:
      'Microsoft style: "%s" needs a context-specific replacement or carries a conditional exception — see the a-z word list before rewriting.',
    link: AZ_BASE + 'q/quit',
    severity: 'error',
    ignoreCase: true,
  });

  // NOTE: `deprecated` -> `obsolete` is deliberately excluded here even
  // though the underlying A-Z entry is CONFIRMED: verifier G's own quote
  // for it carries a "(cond.)" marker ("Avoid in content for a technical
  // audience. Don't use in content for a general audience.") — the exact
  // same audience-conditional shape as the five confirmed Tier-1/Tier-4
  // conflicts, just not one of the five the corrections doc named
  // explicitly. Redocly's docs ARE technical-audience content (and
  // "deprecated" is itself load-bearing OpenAPI vocabulary), so this is
  // excluded rather than shipped unconditionally — see PROVENANCE.md.
  //
  // `SKU` and `SMB` are dropped entirely, not shipped here. Both are bare,
  // case-shouted acronyms with a common, correct, unrelated technical sense
  // in exactly Redocly's own domain — `SKU` as a standard e-commerce/
  // inventory field ("the SKU field") and `SMB` as the Server Message Block
  // network protocol ("mount the SMB share") — with no syntactic anchor
  // distinguishing either sense from Microsoft's intended one (both are
  // just the bare acronym in similar noun position). `SKU` carries a
  // second, independent hazard even where the guide's sense IS intended:
  // its replacement ("edition") is a single word, so an ALL-CAPS match
  // (`applyMatchCase`'s shouting branch) would insert "EDITION", and the
  // guide itself names four acceptable alternatives ("subscription,
  // edition, version, or tier"), not one. Excluded per the same
  // developer-audience-carve-out reasoning as `header`/`disk`/`client`/
  // `utility` — see PROVENANCE.md's "Excluded candidates" table.
  //
  // Every pair below is a different-word/phrase substitution
  // (`EULA`/`End-User License Agreement` -> `license terms` is an acronym
  // expanding to a DIFFERENT descriptive phrase, the same shape as `DMZ` ->
  // `perimeter network`, not the acronym's own literal expansion).
  // Detection-only; severity follows fixability.
  rules['microsoft/az-judgment-words'] = swapRule({
    pairs: {
      '\\bfinalize\\b': 'finish',
      '\\bbug fix\\b': 'software update',
      '\\bbeta\\b(?!\\s+(?:distribution|function|coefficient|particle|blocker|decay)\\b)':
        'preview',
      '\\bEULA\\b': 'license terms',
      '\\bEnd-User License Agreement\\b': 'license terms',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'f/finalize',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // "Don't use unless you have no other choice." No fixed replacement is
  // given -- and "actionable" is an adjective, so a direct-substitution
  // swap to the relative clause "that you can act on" would be
  // ungrammatical in most positions ("actionable insights" ->
  // "that you can act on insights"). Detection-only.
  rules['microsoft/actionable'] = patternRule({
    tokens: ['\\bactionable\\b'],
    message: 'Avoid "%s"; rewrite using "that you can act on" (Microsoft).',
    link: AZ_BASE + 'a/actionable',
    ignoreCase: true,
  });

  // "U.S." and "U.S.A." end in a period: a TRAILING `\b` right after a
  // period-then-space never matches (both are non-word characters) — the
  // same class of bug recheck/google's `no-latinisms` fixed for `vs.`.
  // Leading-only `\b`, baked into the regex source via `keysAreRegex`, is
  // used for those two keys instead; "U.S.A." (11 chars) and "U.S." (4
  // chars) are both pairs in this SAME rule so `dropOverlappedShorterMatches`
  // resolves the overlap by keeping the longer match on "U.S.A." text.
  // `thank you` -> `thanks` lives in `microsoft/az-geography-detect` below,
  // not here — the guide marks it conditional ("formal/serious content
  // OK"). `USA`/`U.S.A.`/`U.S.` -> `US` is an abbreviation-punctuation
  // normalization of the SAME term (it lives in `microsoft/usa-abbreviation`
  // below, kept fixable). `Far East` -> `East Asia` is a genuine
  // terminology substitution -- the two terms don't even have identical
  // scope (Far East traditionally includes Southeast Asia; East Asia
  // doesn't) -- so it stays here, detection-only.
  rules['microsoft/az-geography'] = swapRule({
    pairs: {
      '\\bFar East\\b': 'East Asia',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'f/far-east',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // `fix: false`. "USA"/"U.S.A."/"U.S." are abbreviation-punctuation
  // normalizations of the SAME term in general prose, but plenty of real
  // organizations keep the "wrong" form as part of their own official
  // name: "USA Gymnastics" (the US national governing body for the sport),
  // "U.S. Bank" (a top-10 US bank), "U.S.A. Track and Field" (a national
  // governing body), "U.S. Steel", "U.S. Robotics". Normalizing any of
  // these silently corrupts the org's own name ("USA Gymnastics" ->
  // "US Gymnastics"). Severity drops error -> warn, matching this file's
  // policy for every other rule that flips to detection-only for a
  // word-choice/phrasing reason rather than a structural one.
  rules['microsoft/usa-abbreviation'] = swapRule({
    pairs: {
      '\\bUSA\\b': 'US',
      '\\bU\\.S\\.A\\.': 'US',
      '\\bU\\.S\\.': 'US',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'f/far-east',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  rules['microsoft/az-geography-detect'] = patternRule({
    tokens: ['\\bthank you\\b'],
    message:
      'Microsoft style: prefer "thanks" over "%s" in most content — see the a-z word list for the formal/serious-content exception.',
    link: AZ_BASE + 't/thanks-thank-you',
    severity: 'error',
    ignoreCase: true,
  });

  // `bottom left`/`bottom right` live in
  // `microsoft/az-direction-layout-detect` below, not here — the guide's
  // carve-out ("except in discussions of the BottomLeft/BottomRight
  // properties") is a real API-property-name collision in exactly
  // Redocly's domain. `left-hand`/`right-hand` -> `fix: false`: these are
  // DETECT-ONLY (no replacement is actually stated on the live page for
  // the MODIFIER sense; "left"/"right" are this preset's own inference).
  // Every pair below substitutes a different word/phrase, not a
  // respelling -- `left-justified`/`right-justified` -> `left-aligned`/
  // `right-aligned` is a real typography homograph risk too (justification
  // and alignment are DIFFERENT properties: justified text stretches to
  // fill the line width, aligned text doesn't). Detection-only; severity
  // follows fixability.
  rules['microsoft/az-direction-layout'] = swapRule({
    pairs: {
      'top left': 'upper left',
      'top right': 'upper right',
      'far-left': 'leftmost',
      'far-right': 'rightmost',
      'left-justified': 'left-aligned',
      'right-justified': 'right-aligned',
      'ragged right': 'left-aligned',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'f/far-left-far-right',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['microsoft/az-direction-layout-detect'] = patternRule({
    tokens: ['\\bbottom left\\b', '\\bbottom right\\b'],
    message:
      'Microsoft style: use "lower left"/"lower right" instead of "%s" — except when discussing the BottomLeft/BottomRight API properties (Microsoft).',
    link: AZ_BASE + 'b/bottom-left-bottom-right',
    severity: 'error',
    ignoreCase: true,
  });

  rules['microsoft/left-hand-right-hand'] = swapRule({
    pairs: { 'left-hand': 'left', 'right-hand': 'right' },
    message:
      'Rewrite "%s" using "%s" (Microsoft): no replacement is stated for the modifier sense.',
    link: AZ_BASE + 'l/left-leftmost-left-hand',
    severity: 'error',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // UI nouns. `radio button`, `disjoint selection` (and its siblings
  // `contiguous selection`/`nonadjacent selection`/`noncontiguous
  // selection`, which share the identical "except for a technical
  // audience" carve-out in the same guide sentence), and `header`/`context
  // menu` (developer-audience carve-outs) are deliberately excluded — see
  // the file header and PROVENANCE.md.
  //
  // `blade` is anchored against the noun compounds ("blade
  // server/servers/enclosure/chassis/center(s)/centre(s)") that would
  // otherwise corrupt it ("A blade server occupies one slot" -> "A pane
  // server occupies one slot") — the term means an Azure UI panel, not a
  // physical server module, and the two senses share no verb-position cue
  // the way `exit`/`launch`/`boot` do, so this is anchored on the
  // following noun instead. `hierarchical menu`/`secondary menu` and
  // `running head`/`running foot` live in `microsoft/az-ui-nouns-detect`
  // below, not here — both are conditional in the guide.
  // `blade` -> `pane` ships detection-only despite the anchor above:
  // needing that anchor against "blade server" is itself evidence of
  // homograph risk, not proof the anchor is complete. Severity follows
  // fixability.
  rules['microsoft/az-ui-nouns'] = swapRule({
    pairs: {
      '\\bblade\\b(?!\\s+(?:server|servers|enclosure|chassis|centers?|centres?)\\b)': 'pane',
      '\\binsertion point\\b': 'pointer',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'b/blade',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  rules['microsoft/az-ui-nouns-detect'] = patternRule({
    tokens: [
      '\\bhierarchical menu\\b',
      '\\bsecondary menu\\b',
      '\\brunning head\\b',
      '\\brunning foot\\b',
    ],
    message:
      'Microsoft style: "%s" carries a conditional exception — see the a-z word list before rewriting.',
    link: AZ_BASE + 'h/hierarchical-menu',
    severity: 'error',
    ignoreCase: true,
  });

  // `italics`/`italicized` live in `microsoft/italic-as-noun` below, not
  // here. The guide's own rule ("Use [italic] only as an adjective, not as
  // a noun") means a direct-substitution swap is ungrammatical in exactly
  // the position the avoid-term occupies: "Use italics for emphasis" ->
  // "Use italic for emphasis" (a bare adjective with nothing to modify) —
  // the identical VERB-ABLE-shaped hazard as `actionable`, adjective-for-
  // noun instead of clause-for-verb.
  //
  // `roman` is anchored against the civilization/proper-noun sense ("Roman
  // numerals/Empire/alphabet/...") that would otherwise corrupt it ("Roman
  // numerals are not supported" -> "regular type numerals are not
  // supported") — a homograph collision of the `aka`-inside-`Akamai`
  // shape, not a position-based one, so it's anchored on the following
  // noun instead. Every pair substitutes a different word -- `roman` ->
  // `regular type` ships detection-only despite that anchor: needing it
  // against a long list of proper-noun collisions (Roman numerals/Empire/
  // alphabet/...) is itself evidence of homograph risk. Severity follows
  // fixability.
  rules['microsoft/az-typography'] = swapRule({
    pairs: {
      '\\btypeface\\b': 'font',
      '\\btype style\\b': 'font style',
      '\\bbolded\\b': 'bold',
      '\\bboldface\\b': 'bold',
      '\\broman\\b(?!\\s+(?:numeral|numerals|empire|alphabet|calendar|law|catholic|republic|mythology|god|gods|ruins?|coins?|holiday|road|roads|bath|baths|army|legion|forum|senate|aqueduct)\\b)':
        'regular type',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'r/roman',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  rules['microsoft/italic-as-noun'] = patternRule({
    tokens: ['\\bitalics\\b', '\\bitalicized\\b'],
    message: 'Avoid "%s"; rewrite using "italic" as an adjective, e.g. "italic text" (Microsoft).',
    link: AZ_BASE + 'i/italic',
    severity: 'error',
    ignoreCase: true,
  });

  // `directory`, `disk`, and `context menu` (already excluded above) are
  // Redocly's own developer-audience carve-outs; the remaining filesystem
  // terms below have no such conflict.
  // `home directory` -> `root directory` is the paradigm case: unscoped,
  // this pair corrupts "...so the CLI can find the user's home directory
  // for its config files" into "...find the user's root directory..." --
  // semantically wrong, since the Unix `$HOME` sense has nothing to do
  // with `/`. Every other pair here is also a different-word substitution.
  // Detection-only; severity follows fixability.
  rules['microsoft/az-filesystem'] = swapRule({
    pairs: {
      'child folder': 'subfolder',
      // Scoped against the Unix/CLI $HOME sense ("so the CLI can find the
      // user's home directory for its config files") so the clean fixture
      // doesn't visibly misfire on it -- worth avoiding as noise even on a
      // detection-only rule.
      '\\bhome directory\\b(?!\\s+for\\s+(?:its|the|your|his|her|their)?\\s*config)':
        'root directory',
      'graphics adapter': 'video card',
      'display adapter': 'video card',
      'video adapter': 'video card',
      'graphics card': 'video card',
      'display driver': 'video driver',
      'graphics driver': 'video driver',
      'remote drive': 'network drive',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'c/child-folder',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: true,
  });

  // `labelled`/`labelling` are deliberately NOT here: both already ship in
  // `microsoft/us-spelling`, targeting the same "labeled"/"labeling"
  // replacement — a duplicate pair here would double-report the same span
  // from two different rule names, exactly the class of collision the
  // `multi-factor` note above already avoids. `indices` is deliberately NOT
  // here either: the guide's own carve-out is "use indices only in the
  // context of mathematical expressions" — "array indices"/"loop indices"
  // are extremely common, correct usage in Redocly's own developer-audience
  // domain (matching the `header`/`disk`/`directory` carve-out class), and
  // no positional anchor reliably tells a math use from a non-math one.
  // Excluded rather than shipped guessing which sense applies — see
  // PROVENANCE.md's "Excluded candidates" table.
  //
  // `as well as` and `or greater`/`or higher`/`or lower` live in
  // `microsoft/az-grammar-usage-detect` below, not here. The guide
  // discussing a term is not the same as a blind textual substitution
  // being safe for it:
  //   - `as well as` -> `and`: the live page (a/as-well-as) says "Don't use
  //     as a synonym for and" — a caution against CONFLATING the two, not
  //     an instruction to replace the text. "As well as being fast, the
  //     API is reliable." -> "And being fast, the API is reliable." is not
  //     grammatical English; "and" cannot head a sentence the way "as well
  //     as" (a subordinating phrase) can.
  //   - `or greater`/`or higher`/`or lower` -> `or later`/`or earlier`: the
  //     live pages (g/greater-better, h/higher, l/lower) scope this to
  //     "identifying multiple versions of programs or apps" — a
  //     VERSION-NUMBER rule, not a general-magnitude rule. "A score of 80
  //     or higher to pass" -> "A score of 80 or later to pass" is
  //     nonsensical. `or higher` is ALSO multi-target on its own live page
  //     (OK unchanged for display resolution; "or faster" for processor
  //     speed; only "or later" for version numbers) — no single literal
  //     swap target can express that, the same one-shape/one-output
  //     principle behind `az-state-failure`'s crash/lock-up split.
  // No syntactic anchor reliably tells a version-number context ("Windows
  // 10 or higher") from an ordinary magnitude comparison ("a score of 80
  // or higher") — both are literally "number or higher" — so this ships
  // detection-only rather than guessing. See PROVENANCE.md's fix-posture
  // section.
  //
  // Split: the nine pairs below are all SAME-WORD normalizations -- UK/US
  // spelling variants (`towards`/
  // `upwards`/`afterwards` just add/drop a trailing "s", the same relation
  // as `centre`/`center`) or non-standard/alternate forms of the identical
  // word (`useable`/`usable`, `moveable`/`movable` are alternate spellings;
  // `broadcasted`/`broadcast` and `matrixes`/`appendixes` -> `matrices`/
  // `appendices` are non-standard vs. standard inflections of the same
  // word, the same class as "alot" -> "a lot"). These stay fixable.
  rules['microsoft/az-grammar-usage'] = swapRule({
    pairs: {
      towards: 'toward',
      upwards: 'upward',
      afterwards: 'afterward',
      useable: 'usable',
      moveable: 'movable',
      broadcasted: 'broadcast',
      matrixes: 'matrices',
      appendixes: 'appendices',
      zeroes: 'zeros',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'a/as-well-as',
    severity: 'error',
    ignoreCase: true,
    wordBoundary: true,
  });

  // The remaining pairs from the same original rule are DIFFERENT-word/
  // preposition substitutions, not respellings -- `different to` ->
  // `different from` swaps a different preposition entirely (not an added/
  // dropped letter); `alphabetic`/`numerical` are established, correct
  // technical terms in their own right ("alphabetic character", "numeric
  // keypad") a blind swap would corrupt. Detection-only.
  rules['microsoft/az-grammar-usage-substitutions'] = swapRule({
    pairs: {
      'whether or not': 'whether',
      'center around': 'center on',
      'different to': 'different from',
      'inside of': 'inside',
      'outside of': 'outside',
      'off of': 'off',
      administrate: 'administer',
      alphabetic: 'alphabetical',
      mathematic: 'mathematical',
      numerical: 'numeric',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'a/as-well-as',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  rules['microsoft/az-grammar-usage-detect'] = patternRule({
    tokens: ['\\bas well as\\b', '\\bor greater\\b', '\\bor higher\\b', '\\bor lower\\b'],
    message:
      'Microsoft style: "%s" needs a context-specific rewrite, not a blind substitution — "as well as" is a caution against treating it as a synonym for "and", not an instruction to replace it; "or greater/higher/lower" only becomes "or later/earlier" when identifying program or app version numbers, not general magnitude (Microsoft).',
    link: AZ_BASE + 'a/as-well-as',
    severity: 'error',
    ignoreCase: true,
  });

  // NOTE: "multi-factor authentication" -> "multifactor authentication" is
  // deliberately NOT repeated here — `microsoft/spelling-hyphenation`'s
  // `\bmulti-factor\b` -> `multifactor` pair already covers this phrase
  // (and every other "multi-factor X" occurrence); a duplicate pair here
  // would double-report the same span from two different rule names.
  // The guide's own quote names three terms ("Use OK instead of okay or
  // all right. Never use alright."); `all right`/`alright` live in
  // `microsoft/az-abbreviations-substitutions` below instead of here (see
  // that rule's comment). `pound sign` lives in
  // `microsoft/az-abbreviations-names-detect` below, not here — the guide
  // carries a narrow carve-out ("OK to use pound key (#) ... to refer to
  // the keypad on a telephone").
  // Split: `defrag`/`okay` are same-word abbreviations/spelling variants
  // with no demonstrated unrelated sense -- stay fixable.
  rules['microsoft/az-abbreviations-names'] = swapRule({
    pairs: {
      defrag: 'defragment',
      okay: 'OK',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'h/hexadecimal',
    severity: 'error',
    ignoreCase: true,
    wordBoundary: true,
  });

  // The remaining pairs from the same original rule flip to detection-only,
  // each for its own reason:
  //   - `spec` -> `specification`: the exact named corruption case ("The
  //     contractor built the connector on spec" -> "...on specification" --
  //     "on spec" is a bid/contract idiom unrelated to "specification").
  //     Same-word-abbreviation shape (like `hex`/`defrag`) but the SECOND
  //     mechanical exception applies: the avoid-term is also a different
  //     word in another sense.
  //   - `hex` -> `hexadecimal`: same exception -- "hex" is also a curse/
  //     spell ("put a hex on") and a mechanical-fastener term ("hex nut",
  //     "hex bolt"), both common and unrelated to hexadecimal notation.
  //   - `alright`/`all right` -> `OK`: a genuine different-word substitution
  //     ("alright" is a non-standard spelling, but "OK" is not the same
  //     word normalized -- it's a different word entirely); "all right" is
  //     also two ordinary words that can appear compositionally ("not all
  //     right answers are equally weighted"), which this pair would corrupt.
  //   - `MSFT` -> `Microsoft`: not a word-choice issue but a genuine fix
  //     defect -- `MSFT` is virtually always written all-caps (it's a stock
  //     ticker), and `applyMatchCase`'s all-caps branch shouts a single-word
  //     replacement, so the "fix" would produce "MICROSOFT" (wrong casing
  //     for a proper noun/trademark), not the configured "Microsoft".
  rules['microsoft/az-abbreviations-substitutions'] = swapRule({
    pairs: {
      hex: 'hexadecimal',
      // Scoped against the "on spec" bid/contract idiom ("The contractor
      // built the connector on spec") so the clean fixture doesn't visibly
      // misfire on it -- worth avoiding as noise even on a detection-only
      // rule.
      '(?<!\\bon\\s)\\bspec\\b': 'specification',
      MSFT: 'Microsoft',
      alright: 'OK',
      'all right': 'OK',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'h/hexadecimal',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: true,
  });

  rules['microsoft/az-abbreviations-names-detect'] = patternRule({
    tokens: ['\\bpound sign\\b'],
    message:
      'Microsoft style: use "number sign" instead of "%s" — except for the literal phone-keypad key (Microsoft).',
    link: AZ_BASE + 'n/number-sign',
    severity: 'error',
    ignoreCase: true,
  });

  // `navigate` and `scroll` are Tier-4 audience/UI conditionals (excluded —
  // see the file header).
  //
  // `visit` would need anchoring against the noun-compound sense ("visit
  // counts/duration/frequency/history/log/data" — an analytics metric, not
  // a verb) to avoid corrupting it ("Visit counts are aggregated per day"
  // -> "Go to counts are aggregated per day"), but it lives in
  // `microsoft/az-navigation-detect` below instead, fully detection-only.
  // The live v/visit page's full text is more permissive than "always use
  // go to": "use go to in most cases" (not "always"), and "It's OK to use
  // visit ... if you're using a tone that's meant to imply [a suggestion,
  // or the intention of browsing around]" — with the guide's OWN worked
  // example using "Visit" approvingly ("Visit the product website to learn
  // about offerings..."). A blind fix would rewrite Microsoft's own
  // approved example. Worse, a noun-compound anchor only excludes SPECIFIC
  // following words — "visit" preceded by an article ("Schedule a visit",
  // "during my visit") is a common, correct noun sense such an anchor would
  // never cover, and "Go to" isn't a grammatical noun ("Schedule a go to
  // with the doctor"). No anchor can tell a tone ("suggestion" vs.
  // "action") apart, so this ships detection-only. `hot link` has no such
  // nuance (unconditional, single named replacement) and stays fixable
  // here.
  //
  // `bookmark` -> `favorite` needs its own rule with `fix: false`, not a
  // pair in this one: the guide names `bookmark` VERB-ABLE ("Bookmark this
  // page" is a verb use whose replacement, "favorite," is not reliably
  // accepted as a verb outside informal/social-product UI copy) —
  // matching `az-verb-able`'s own treatment for the identical hazard
  // shape, and `fix` is a whole-RULE flag, not per-pair.
  //
  // `hot link` -> `link` drops a word rather than respelling one --
  // detection-only; severity follows fixability.
  rules['microsoft/az-navigation'] = swapRule({
    pairs: {
      '\\bhot link\\b': 'link',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'v/visit',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  rules['microsoft/az-navigation-detect'] = patternRule({
    tokens: ['\\bvisit\\b(?!\\s+(?:count|counts|duration|frequency|history|log|data)\\b)'],
    message:
      'Microsoft style: use "go to" instead of "%s" in most cases — but "visit" is OK for a suggestion/browsing tone (Microsoft); see the a-z word list before rewriting.',
    link: AZ_BASE + 'v/visit',
    severity: 'error',
    ignoreCase: true,
  });

  rules['microsoft/bookmark-favorite'] = swapRule({
    pairs: { bookmark: 'favorite' },
    message: 'Rewrite "%s" using "%s" (Microsoft): a direct substitution may be ungrammatical.',
    link: AZ_BASE + 'b/bookmark',
    severity: 'error',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // From the guide's "(all don't use)" bundle: only the terms with NO
  // fixed replacement given anywhere on their own page are detection-only
  // here.
  rules['microsoft/az-no-replacement'] = patternRule({
    tokens: [
      '\\bblack box\\b',
      '\\bdot-com\\b',
      '\\bedutainment\\b',
      '\\bhoneypot\\b',
      '\\bbackbone\\b',
      '\\bwordwrap\\b',
      '\\bnatural user interface\\b',
      '\\bNUI\\b',
      '\\bsubaddress\\b',
    ],
    message: 'Don\'t use "%s" (Microsoft); be specific instead.',
    link: AZ_BASE + 'b/black-box',
    severity: 'error',
    ignoreCase: true,
  });

  // From the same bundle, but each of these has a real, single, stated
  // replacement, unlike the no-replacement terms above.
  //
  // `print out` needs anchoring against the noun-compound sense ("a print
  // out OF the receipt" — a printed copy) to avoid corrupting it. The
  // guide's own quote is verb-scoped ("As a verb, use print instead of
  // print out"); the noun sense is a separate, grammatically distinct
  // usage ("print out" + "of" + the described item) the guide's entry
  // never addresses. The noun sense doesn't require a following "of"
  // though — "Keep the print out safe"/"Attach the print out to the
  // ticket" are equally common noun uses a following-"of" anchor alone
  // would miss. A negative lookbehind excluding a preceding
  // determiner/possessive closes that gap, the same noun-signaling
  // position `leverage`'s own comment considers — the verb sense ("print
  // out the report") is never preceded by a determiner directly, so this
  // doesn't touch genuine violations.
  //
  // Every pair is a different-word/phrase substitution, not a respelling
  // -- including `print out` -> `print`, despite the extensive
  // noun-compound anchoring above (anchoring reduces false fixes, it
  // doesn't turn a word-choice substitution into a same-word
  // normalization). Detection-only; severity follows fixability.
  rules['microsoft/az-real-replacements'] = swapRule({
    pairs: {
      '\\bfriendly name\\b': 'display name',
      '\\bprint queue\\b': 'list of documents',
      '\\bprinter queue\\b': 'list of documents',
      '\\bdata record\\b': 'record',
      '\\be-form\\b': 'form',
      '\\bupsize\\b': 'scale up',
      '\\bworking memory\\b': 'available memory',
      '\\bsoft copy\\b': 'file',
      '(?<!\\b(?:a|an|the|this|that|your|my|its|his|her|their|our)\\s)\\bprint out\\b(?!\\s+of\\b)':
        'print',
      '\\bsearch and replace\\b': 'find and replace',
      '\\btarget drive\\b': 'destination drive',
      '\\btarget file\\b': 'destination file',
    },
    message: 'Microsoft style: use "%s" instead of "%s".',
    link: AZ_BASE + 'f/friendly-name',
    severity: 'warn',
    fix: false,
    ignoreCase: true,
    keysAreRegex: true,
    wordBoundary: false,
  });

  // ======================================================================
  // UI VERBS AND CHECKBOX/DIALOG TERMINOLOGY — `warn`. The single sharpest
  // divergence from recheck/google (which allows "click"): Microsoft bans
  // all input-specific verbs.
  // ======================================================================

  // "Don't use input-specific verbs, such as click or swipe." Anchored to
  // exclude the hyphen-joined compounds `double-click`/`right-click` (a
  // real substring risk: \bclick\b DOES match inside "double-click" once a
  // hyphen precedes it, since a hyphen is a non-word character) and the
  // unrelated compounds `clickstream`/`clickthrough`.
  //
  // The live c/click page says "Avoid this VERB" — the ban is verb-scoped,
  // so the hyphen/letter-adjacent compound exclusion above isn't enough on
  // its own: it doesn't cover the ordinary NOUN sense ("click count",
  // "clicks per session", "track clicks") that's genuinely common in
  // analytics/UI-event documentation — plausible in Redocly's own domain.
  // A noun-compound follow-word exclusion for `click`/`clicks` closes that
  // gap, matching the same technique `impact-verb`/`blade`/`exit` already
  // use. Residual, accepted risk (not anchored): the live page's own
  // carve-out "It's OK to use click when you need to describe mouse
  // actions specifically" isn't mechanically detectable (same class as
  // `hex`'s mechanical-fastener sense) — low practical likelihood in
  // Redocly's API-documentation domain, left as a documented residual per
  // PROVENANCE.md rather than expanded further.
  //
  // `click`/`clicks`/`clicking`/`clicked` -> `select` ships detection-only:
  // even with the extensive noun-compound anchoring above, this is a
  // different-word substitution for a highly polysemous UI verb, not a
  // respelling. Severity was already `warn` by default.
  rules['microsoft/no-click'] = swapRule({
    pairs: {
      'click on': 'select',
      '(?<![\\w-])click(?![a-zA-Z])(?!\\s+(?:count|counts|rate|rates|event|events|tracking|data|metrics?|history|id|ids|per)\\b)':
        'select',
      '(?<![\\w-])clicks(?![a-zA-Z])(?!\\s+(?:count|counts|rate|rates|event|events|tracking|data|metrics?|history|per)\\b)':
        'selects',
      '(?<![\\w-])clicking(?![a-zA-Z])': 'selecting',
      '(?<![\\w-])clicked(?![a-zA-Z])': 'selected',
    },
    message: 'Use "%s" instead of "%s" (Microsoft: avoid input-specific verbs).',
    fix: false,
    link: DESCRIBING_UI,
    ignoreCase: true,
    wordBoundary: false,
    keysAreRegex: true,
  });

  // "Don't use press, depress, hit, or strike [to describe pressing a
  // key]. Use select instead." Narrowly anchored to recognizable key-press
  // phrasing — bare "press"/"hit"/"strike" are far too polysemous
  // (press releases, press charges, hit a milestone, strike a balance) to
  // match unconditionally. Detection-only: the correct rewrite depends on
  // the surrounding sentence.
  rules['microsoft/press-key-verb'] = patternRule({
    tokens: [
      '\\b(?:press|hit|strike)\\s+(?:the\\s+)?(?:Enter|Tab|Esc|Escape|Delete|Backspace|spacebar|Ctrl|Shift|Alt)\\b',
      '\\b(?:press|hit|strike)\\s+the\\s+\\S+\\s+key\\b',
    ],
    message: 'Use "select" to describe pressing a key, not "%s" (Microsoft).',
    link: 'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/h/hit',
    ignoreCase: true,
  });

  // "Don't use [uncheck/unmark/unselect]. Use clear [for checkboxes]."
  // Bare "check"/"deselect" are deliberately excluded: "check" is
  // extremely polysemous (check the logs, check that X is true), and the
  // guide's replacement for "deselect" differs by UI-element type
  // ("clear" for checkboxes, "cancel the selection" elsewhere) in a way a
  // blind swap can't resolve.
  // Unscoped, this pair corrupts "Use the API to unmark a conversation as
  // read..." into "...to clear a conversation as read...". Different-word
  // substitution, not a respelling. Detection-only; severity was already
  // `warn` by default.
  rules['microsoft/checkbox-verbs'] = swapRule({
    pairs: { uncheck: 'clear', unmark: 'clear', unselect: 'clear' },
    message: 'Use "%s" instead of "%s" for checkboxes (Microsoft).',
    link: DESCRIBING_UI,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "Don't use pop-up window, dialog box, or dialogue box."
  // `pop-up window` -> `dialog` conflates two different UI concepts (not
  // every pop-up is a dialog) and `dialog box`/`dialogue box` -> `dialog`
  // drops a word rather than respelling one. Detection-only; severity was
  // already `warn` by default.
  rules['microsoft/dialog-terminology'] = swapRule({
    pairs: {
      'pop-up window': 'dialog',
      'dialog box': 'dialog',
      'dialogue box': 'dialog',
    },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: FORMATTING_TEXT_IN_INSTRUCTIONS,
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "Don't use mouse over or move the mouse pointer to." (Conditionally OK
  // for beginner-skill content, per the same page — low risk for reference
  // documentation.) Note the link's slug: it's
  // "mouse-mouse-interaction-terms", not "mouse-and-mouse-interaction-terms"
  // -- the latter 404s.
  // `mouse over` -> `hover over` is a different-word substitution, not a
  // respelling. Detection-only; severity was already `warn` by default.
  rules['microsoft/mouse-over'] = swapRule({
    pairs: { 'mouse over': 'hover over' },
    message: 'Use "%s" instead of "%s" (Microsoft).',
    link: 'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/term-collections/mouse-mouse-interaction-terms',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "Don't put a space around the plus sign (+) in keyboard shortcuts."
  // Detection-only (not `swap`): `swap` replacements are literal, and the
  // fix would need to reproduce whichever modifier key matched -- not
  // possible without capture-group interpolation, which the engine does
  // not support (see the file header).
  rules['microsoft/keyboard-shortcut-plus-spacing'] = patternRule({
    tokens: ['\\b(?:Ctrl|Alt|Shift|Cmd)\\s+\\+\\s+'],
    message: 'Don\'t put a space around "+" in a keyboard shortcut (Microsoft): "%s"',
    link: FORMATTING_TEXT_IN_INSTRUCTIONS,
  });

  // "Don't use log in, login, log into, log on, ... Use sign in or sign
  // out instead." `fix: false`: "login"/"logon" are frequently used as
  // NOUNS or adjectives ("the login page", "your login credentials"),
  // where "sign in" (a verb phrase) does not slot in grammatically —the
  // same class of mismatch as `az-verb-able` above, just noun-for-noun
  // reversed.
  rules['microsoft/sign-in-sign-out'] = swapRule({
    pairs: {
      'log into': 'sign in to',
      'log onto': 'sign in to',
      'log in': 'sign in',
      login: 'sign in',
      'log on': 'sign in',
      logon: 'sign in',
      'log off': 'sign out',
      'log out': 'sign out',
      logout: 'sign out',
      'sign into': 'sign in to',
      signin: 'sign in',
      'sign off': 'sign out',
    },
    message:
      'Rewrite "%s" as "%s" (Microsoft): "login"/"logon" as a noun needs a sentence rewrite.',
    link: 'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/l/log-on-log-off',
    fix: false,
    ignoreCase: true,
    wordBoundary: true,
  });

  // ==========================================================================
  // DETECTION-ONLY (2026-07-30): structural override, not a per-rule policy.
  //
  // Every individual `fix: false` set above (and every rule that never had a
  // `fix` option to begin with) is now REDUNDANT, not load-bearing -- this
  // loop forces every rule in this preset to `fix: false` regardless of what
  // its own builder call sets, so a future contributor cannot silently
  // reintroduce fixing here by adding a new pair or omitting `fix: false` on
  // a new `swapRule()` call. See this file's header doc ("DETECTION-ONLY BY
  // DESIGN" section) and `presets/microsoft/PROVENANCE.md`'s "Detection-only"
  // section for why: five independent adversarial probes of this preset's
  // (and `recheck/google`'s) previously-fixable pairs, across three rounds of
  // narrowing the fix-safety criterion, found a RISING corruption rate (the
  // last round: 18 of 29 probed pairs, 62%) spanning every category once
  // believed safe, including spelling and hyphenation. The conclusion was
  // that a rule's category does not predict fix-safety -- so the fix is
  // structural, not another round of narrowing.
  //
  // The permanent guarantee this creates is `preset-microsoft.test.ts`'s
  // "no rule in recheck/microsoft is fixable" test, which reads this LIVE
  // returned object (not a hand-maintained list of rule names) -- the same
  // derive-from-the-preset shape the per-pair coverage gate already uses.
  // Detection is unaffected: `execute()` still runs and reports for every
  // rule; only `fix()` is gated off, via `core/runner.ts`'s
  // `rule.fix !== false` check.
  for (const rule of Object.values(rules)) {
    rule.fix = false;
  }

  return rules;
}
