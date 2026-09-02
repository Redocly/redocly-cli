import type { BaseRule, RecheckConfig } from '../../types/index.js';

/**
 * `recheck/plain-language` — composable preset derived from the live US
 * federal plain-language guidance (public domain; no CC-BY attribution
 * constraint, but pages are still cited below and in
 * `packages/recheck/presets/plain-language/PROVENANCE.md` for auditability).
 * Layers onto either flagship (`recheck/google`, `recheck/microsoft`) or
 * onto `recheck/prose`.
 *
 * SOURCE: `plainlanguage.gov` is DEAD — every path under it
 * (`/guidelines/words/...`, `/guidelines/sentences/`, `/guidelines/
 * paragraphs/`, even the classic `FederalPlainLanguageGuidelines.pdf`) now
 * 301-redirects to a single, much thinner overview page:
 * `https://digital.gov/guides/plain-language`. Everything below is sourced
 * from what is actually LIVE on `digital.gov` today, not from the old
 * site's archived content (which now survives only in a non-`.gov` GitHub
 * mirror, out of scope for a `.gov`-sourced preset).
 *
 * WHAT DOESN'T SHIP, AND WHY (the shape-changing finding):
 *
 *   - NO readability/grade-level `metric` rule. No live federal page states
 *     a Flesch score, a reading-ease number, or a grade level as a target.
 *     The one "8th grade" mention on the site is an argument AGAINST a fixed
 *     target ("Don't write for an 8th-grade class if your readers are PhD
 *     candidates... Only write for 8th graders if your audience is, in
 *     fact, an 8th-grade class") — reporting this as a licensed number would
 *     be the exact fabrication shape (a scorable threshold attributed to a
 *     guide that never published one) this whole phase's provenance
 *     discipline exists to catch. `metric` stays a documented opt-in
 *     (`DOCUMENTED_OPT_IN_ASSERTIONS`, presets/index.ts) — unchanged by this
 *     preset.
 *   - NO sentence-length `length` rule. Only qualitative advice exists
 *     ("write short sentences", "express only one idea in each sentence");
 *     no word count is stated anywhere on the live site.
 *   - NO nominalizations rule. The live page's own concrete content here is
 *     two full-sentence before/after examples (not word pairs) plus a
 *     morphological pattern (suffixes -ment/-tion/-sion/-ance + link verbs
 *     achieve/effect/give/have/make/reach/take). That pattern is NOT safely
 *     concrete: ordinary, entirely correct nouns sharing those suffixes
 *     ("chance", "moment", "information", "attention", "decision" used
 *     plainly) would false-positive constantly under any verb+suffix
 *     pattern rule. This is the same "abstract advice, not concrete pairs"
 *     shape as sentence length and the readability metric — omitted rather
 *     than shipped noisy.
 *
 * WHAT DOES SHIP, because it's genuinely concrete on the live site:
 * paragraph length (the one family with real, quotable numbers), filler/
 * wordy phrases, complex-word substitutes, redundant pairs (doublets),
 * double negatives, and jargon-to-plain examples — each with its exact
 * source URL and quote in PROVENANCE.md.
 *
 * `shall`/`implement`/`command` HAZARD (spec correction 2026-07-30): the
 * live guide lists all three as words to avoid, but none of that guidance
 * anticipates Recheck's actual target corpus. **`shall` is not shipped at
 * all** — it is a defined RFC 2119 normative keyword (MUST/SHOULD/MAY/
 * SHALL) used throughout specifications and API documentation, exactly what
 * Recheck lints; flagging it would be actively wrong for that entire
 * document class. `implement` (software/API sense: "implement an
 * interface", "implement this endpoint") and `command` (CLI/terminal sense)
 * carry the identical technical-sense collision and are excluded for the
 * same reason — see PROVENANCE.md's "Excluded (technical-sense collision)"
 * section.
 *
 * COMPOSITION — measured, not assumed (project owner request, post-drafting
 * audit): stacking a composable preset onto a flagship can make one finding
 * get reported TWICE, once by each preset's own rule, for the identical
 * span — noise that makes a composable preset feel broken. Measured with
 * `lintContent` over this preset's own violations fixture under
 * `['recheck/google', 'recheck/plain-language']` and `['recheck/microsoft',
 * 'recheck/plain-language']` (see `preset-composition.test.ts`'s "duplicate
 * findings" describe block for the live, asserted counts):
 *
 *   - **`in order to` -> `to` and `utilize`/`utilization` -> `use` were
 *     REMOVED from this preset** (were in `plain-language/filler-phrases`
 *     and `plain-language/complex-words` respectively) after the audit
 *     found both are ALREADY shipped, with the identical replacement, by
 *     BOTH flagships (`google/in-order-to` + `microsoft/simple-words` for
 *     the first; `google/utilize` + `microsoft/simple-words` for the
 *     second) — a smaller preset that adds only what's missing beats one
 *     that pads itself with content two other presets already say. See
 *     each rule's own comment below and PROVENANCE.md's "Duplicate-finding
 *     audit" section for the exact counts before/after this removal.
 *   - **`plain-language/paragraph-sentence-count` (max 8 sentences) is
 *     KEPT despite regularly co-firing with `microsoft/paragraph-length`
 *     (max 7 sentences)** when stacked onto `recheck/microsoft` — this one
 *     is NOT a removal candidate: the two numbers are independently
 *     sourced from two different guides (Microsoft states a LINE-COUNT
 *     proxied through sentences; the federal guidance states an actual
 *     SENTENCE-COUNT recommendation) and are only *approximately* the same
 *     threshold, not identical guidance restated. Removing it would leave
 *     this preset with no paragraph-length signal at all when used
 *     standalone or with `recheck/google` (which ships no paragraph-length
 *     rule of its own). The expected overlap when stacked with
 *     `recheck/microsoft` specifically is documented, not silent — see
 *     PROVENANCE.md.
 *   - A few remaining measured duplicates (e.g. `plain-language/double-
 *     negative-phrases`' "has not yet attained" also tripping
 *     `google/use-contractions`' unrelated "has not" -> "hasn't" pair) are
 *     coincidental text-level overlaps between two independently-motivated
 *     rules, not content equivalence — kept, and called out in
 *     PROVENANCE.md rather than engineered away.
 *
 * AUDIENCE NOTE: this preset adds the MOST value standalone, with
 * `recheck/prose`, or for a project using neither flagship. Stacked onto
 * exactly one flagship it still fills real gaps that flagship's own
 * editorial pass left out, but expect some remaining overlap on the
 * families both sources independently state.
 *
 * DETECTION-ONLY BY DESIGN, from the start: a word-list preset is the exact
 * shape that produces the auto-fix corruption both flagship presets are
 * structurally guarded against (see their own "DETECTION-ONLY BY DESIGN"
 * notes). `buildPlainLanguagePreset()` forces `fix: false` onto every rule
 * it returns, the identical mechanism `recheck/google`/`recheck/microsoft`/
 * `recheck/inclusive-language` use.
 */

const CLEAR_SHORT = 'https://digital.gov/guides/plain-language/writing/clear-short';
const STYLE_PAGE = 'https://digital.gov/guides/plain-language/writing/style';
const FAMILIAR_TERMS = 'https://digital.gov/guides/writing-understanding/familiar-terms';
const SHORT_SIMPLE = 'https://digital.gov/guides/plain-language/principles/short-simple';
const AVOID_JARGON = 'https://digital.gov/guides/plain-language/principles/avoid-jargon';

// -- small builders, mirroring google.ts/microsoft.ts's identical shape --

function swapRule(opts: {
  pairs: Record<string, string>;
  message: string;
  link: string;
  scope?: string | string[];
  ignoreCase?: boolean;
  wordBoundary?: boolean;
}): BaseRule {
  return {
    severity: 'warn',
    scope: opts.scope ?? 'summary',
    link: opts.link,
    message: opts.message,
    assertions: {
      swap: {
        pairs: opts.pairs,
        ignoreCase: opts.ignoreCase,
        wordBoundary: opts.wordBoundary,
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
}): BaseRule {
  return {
    severity: 'warn',
    scope: opts.scope ?? 'summary',
    link: opts.link,
    message: opts.message,
    assertions: {
      pattern: {
        tokens: opts.tokens,
        ignoreCase: opts.ignoreCase,
      },
    },
  };
}

export function buildPlainLanguagePreset(): RecheckConfig {
  const rules: RecheckConfig = {};

  // ======================================================================
  // PARAGRAPH LENGTH — the one family with real, stated numbers.
  // ======================================================================

  // "Paragraphs should never be longer than 250 words." An absolute,
  // guide-stated ceiling (not attributed to a third party) — `error`,
  // matching the severity policy both flagship presets use for a guide's
  // own unconditional numeric statement (e.g. `google/sentence-length`).
  rules['plain-language/paragraph-max-words'] = {
    severity: 'error',
    scope: 'paragraph',
    link: CLEAR_SHORT,
    message:
      'Paragraph is %s %s long; federal plain-language guidance says paragraphs should never exceed 250 words (max %s).',
    assertions: { length: { unit: 'words', max: 250 } },
  };

  // "Writing experts recommend paragraphs of no more than 150 words in
  // three to eight sentences." A softer, explicitly-attributed
  // recommendation (not the guide's own unconditional voice) — `warn`.
  // Only the upper bound ships, matching `microsoft/paragraph-length`'s own
  // precedent for the identical family: a `min` floor over-fires on
  // ordinary, correct single-sentence paragraphs (a short lead-in to a code
  // block, an image caption), which is common and correct in reference
  // documentation.
  rules['plain-language/paragraph-sentence-count'] = {
    severity: 'warn',
    scope: 'paragraph',
    link: CLEAR_SHORT,
    message:
      'Paragraph is %s %s long; federal plain-language guidance recommends at most 8 (roughly 150 words) (max %s).',
    assertions: { length: { unit: 'sentences', max: 8 } },
  };

  // ======================================================================
  // FILLER / WORDY PHRASES — "Check your prepositions" table (style page).
  // ======================================================================

  // "in order to" -> "to" is confirmed verbatim on the live page (and was
  // the original plan's own named example) — but it is DELIBERATELY NOT
  // SHIPPED here, per the cross-preset duplicate-finding audit (see this
  // file's header "COMPOSITION" note and PROVENANCE.md's "Duplicate-finding
  // audit" section): both `google/in-order-to` and `microsoft/simple-words`
  // already ship the identical pair (same phrase, same replacement "to"),
  // so shipping it a third time here would only ever produce a duplicate
  // finding when this preset is stacked onto either flagship, never a new
  // one. `be responsible for` -> `must` is ALSO deliberately not shipped,
  // for an unrelated reason: the live page pairs them, but "be responsible
  // for" is extremely common, entirely correct language describing genuine
  // accountability ("the team is responsible for the migration"), not
  // wordiness — a blind flag would misfire on ordinary correct prose far
  // more than it would ever catch true padding. `an amount of` (a
  // templated phrase, "an amount of X" -> "X") ships separately below as
  // detection-only, since there's no fixed single-word replacement.
  rules['plain-language/filler-phrases'] = swapRule({
    pairs: {
      'a number of': 'several, a few, or many',
      'a sufficient number of': 'enough',
      'at this point in time': 'now',
      'is able to': 'can',
      'on a monthly basis': 'monthly',
      'on the ground that': 'because',
    },
    message: 'Prefer "%s" over the padded phrase "%s" (federal plain-language guidance).',
    link: STYLE_PAGE,
    ignoreCase: true,
    wordBoundary: true,
  });

  // Templated phrase ("an amount of X" -> "X") — no fixed single-word
  // replacement exists, so this is detection-only rather than a `swap`.
  rules['plain-language/an-amount-of'] = patternRule({
    tokens: ['\\ban amount of\\b'],
    message:
      'Avoid the padded phrase "%s"; state the amount directly (federal plain-language guidance).',
    link: STYLE_PAGE,
    ignoreCase: true,
  });

  // "Omit unnecessary words... excess intensifiers and qualifiers, such as
  // absolutely, actually, completely, really, quite, totally, very." A
  // concrete, literal cut-list (not a template), quoted directly from the
  // live guide — detection-only, since cutting an intensifier is an
  // editorial judgment call, not a mechanical substitution.
  rules['plain-language/excess-intensifiers'] = patternRule({
    tokens: [
      '\\babsolutely\\b',
      '\\bactually\\b',
      '\\bcompletely\\b',
      '\\breally\\b',
      '\\bquite\\b',
      '\\btotally\\b',
      '\\bvery\\b',
    ],
    message: 'Consider cutting the intensifier "%s" (federal plain-language guidance).',
    link: SHORT_SIMPLE,
    ignoreCase: true,
  });

  // ======================================================================
  // COMPLEX WORDS / SIMPLE SUBSTITUTES — familiar-terms page.
  // ======================================================================

  // `implement` (-> carry out, start) and `this activity, command` (->
  // us, we — itself a garbled/mismatched table row on the live page, not
  // an extraction error) are DELIBERATELY EXCLUDED: `implement` collides
  // with ordinary, correct software/API vocabulary ("implement an
  // interface", "implement this endpoint") and `command` collides with the
  // CLI/terminal sense that is core vocabulary in developer docs — exactly
  // the technical-sense hazard this preset's file header calls out
  // alongside `shall` (which is excluded from every family, not just this
  // one — see the file header; `shall` never appears anywhere in this
  // file).
  //
  // `utilize`/`utilization` -> `use` is ALSO confirmed verbatim on the live
  // page but DELIBERATELY NOT SHIPPED, for the same duplicate-finding
  // reason as `in order to` above (see this file's header "COMPOSITION"
  // note and PROVENANCE.md's "Duplicate-finding audit"): both
  // `google/utilize` and `microsoft/simple-words` already flag this exact
  // word toward "use", so shipping it here adds no coverage a user without
  // either flagship active doesn't already get from a THIRD source of
  // truth having no gap to fill.
  rules['plain-language/complex-words'] = swapRule({
    pairs: {
      addressee: 'you',
      assist: 'help',
      assistance: 'help',
      commence: 'begin',
      'in order that': 'for',
      'in the amount of': 'for',
      'in the event of': 'if',
      promulgate: 'issue',
    },
    message: 'Use "%s" instead of "%s" (federal plain-language guidance).',
    link: FAMILIAR_TERMS,
    ignoreCase: true,
    wordBoundary: true,
  });

  // ======================================================================
  // REDUNDANT PAIRS (doublets) — principles/short-simple page.
  // ======================================================================

  // NOTE: "each and every", "null and void", "true and correct", "first and
  // foremost", "any and all", "full and complete" do NOT appear anywhere on
  // the live site (grepped explicitly) — only these three doublets are
  // actually live; do not cite the others as guide-derived.
  rules['plain-language/redundant-pairs'] = swapRule({
    pairs: {
      'due and payable': 'due',
      'cease and desist': 'stop',
      'knowledge and information': 'knowledge or information',
    },
    message: 'Use "%s" instead of the redundant pair "%s" (federal plain-language guidance).',
    link: SHORT_SIMPLE,
    ignoreCase: true,
    wordBoundary: true,
  });

  // ======================================================================
  // DOUBLE NEGATIVES — writing/style page.
  // ======================================================================

  // The two fixed phrases ship as a `swap`; "may not ... until" and "is
  // not ... unless" carry variable text between their two halves in the
  // guide's own quote and can't be a literal-phrase swap, so they ship as
  // `pattern` below instead.
  rules['plain-language/double-negative-phrases'] = swapRule({
    pairs: { 'has not yet attained': 'is under', 'no fewer than': 'at least' },
    message: 'Use "%s" instead of the double negative "%s" (federal plain-language guidance).',
    link: STYLE_PAGE,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "may not ... until" -> "may only ... when"; "is not ... unless" ->
  // "only if". Both carry variable text between their two halves (the
  // guide's own quote uses "…"), so a literal-phrase `swap` can't express
  // them — bounded to `scope: sentence`, mirroring `google/neither-nor`'s
  // identical "two markers, bounded within one sentence" shape.
  rules['plain-language/double-negative-patterns'] = {
    severity: 'warn',
    scope: 'sentence',
    link: STYLE_PAGE,
    message:
      'Avoid the double-negative construction in "%s"; state it positively (federal plain-language guidance).',
    assertions: {
      pattern: {
        tokens: [
          '\\bmay not\\b(?:(?!\\buntil\\b)[\\s\\S])*?\\buntil\\b',
          '\\bis not\\b(?:(?!\\bunless\\b)[\\s\\S])*?\\bunless\\b',
        ],
        ignoreCase: true,
      },
    },
  };

  // ======================================================================
  // JARGON -> EVERYDAY LANGUAGE — principles/avoid-jargon page.
  // ======================================================================

  rules['plain-language/jargon-terms'] = swapRule({
    pairs: { 'Riverine avifauna': 'River birds', 'Involuntarily undomiciled': 'Unhoused' },
    message: 'Use "%s" instead of the jargon term "%s" (federal plain-language guidance).',
    link: AVOID_JARGON,
    ignoreCase: true,
    wordBoundary: true,
  });

  // ==========================================================================
  // DETECTION-ONLY BY DESIGN: structural override, not a per-rule policy —
  // identical mechanism to `buildGooglePreset()`/`buildMicrosoftPreset()`/
  // `buildInclusiveLanguagePreset()`'s own loop.
  // ==========================================================================
  for (const rule of Object.values(rules)) {
    rule.fix = false;
  }

  return rules;
}
