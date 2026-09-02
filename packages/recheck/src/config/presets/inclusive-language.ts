import type { BaseRule, RecheckConfig } from '../../types/index.js';

/**
 * `recheck/inclusive-language` — composable, guide-agnostic preset: the
 * INTERSECTION of `recheck/google` and `recheck/microsoft`'s inclusive /
 * bias-free / ableist / accessibility content — terminology BOTH flagship
 * guides independently state should be avoided. Layers onto either flagship
 * (`extends: [recheck/google, recheck/inclusive-language]` or
 * `[recheck/microsoft, recheck/inclusive-language]`) or onto `recheck/prose`.
 *
 * PROVENANCE: this preset needed no separate web verification -- every term
 * below was already confirmed against a live page as part of verifying
 * `recheck/google`'s inclusive/ableist language and `recheck/microsoft`'s
 * bias-free, militaristic-language, and accessibility-terms content.
 *
 * See `packages/recheck/presets/inclusive-language/PROVENANCE.md` for the
 * full source -> term table, and its "Excluded" section for every term
 * considered and left out (guide-only coverage, false-positive risk, or an
 * already-established correction this file carries forward).
 *
 * WHY AN INTERSECTION, NOT A UNION: where only one guide covers a term,
 * shipping it here would make this preset silently guide-specific — the
 * opposite of "composable with either flagship." A term ships here ONLY
 * when BOTH guides independently confirm it. That does NOT, however, mean
 * stacking this preset onto a flagship is duplicate-free — see COMPOSITION
 * below, which corrects an earlier draft of this comment that claimed it
 * was.
 *
 * COMPOSITION — measured, not assumed (project owner request, post-drafting
 * audit): because every term here is, BY CONSTRUCTION, already confirmed on
 * at least one flagship's own live-guide research, most of them are ALSO
 * already shipped by at least one flagship's own preset. Measured with
 * `lintContent` over this preset's own violations fixture (see
 * `preset-composition.test.ts`'s "duplicate findings" describe block for
 * the live, asserted counts):
 *
 *   - Stacked onto `recheck/google` alone: 7 of this preset's 11 rules
 *     (`slave`, `blacklist-whitelist`, `grayed-out`, `he-she`, `dmz`,
 *     `nuke`, `suffering-victim`) duplicate a `google/*` rule at the exact
 *     same span. The other 4 (`master-slave-pairing`, `nondisabled-person`,
 *     `differently-abled`, `crippled`) are genuine gap-fills — Google's own
 *     preset doesn't ship them.
 *   - Stacked onto `recheck/microsoft` alone: 6 of 11 (`dmz`,
 *     `master-slave-pairing`, `nondisabled-person`, `differently-abled`,
 *     `crippled`, `blacklist-whitelist`) duplicate a `microsoft/*` rule.
 *     The other 5 (`slave`, `grayed-out`, `he-she`, `suffering-victim`,
 *     `nuke`) are gap-fills Microsoft's own preset doesn't ship.
 *   - The UNION of the two duplicate sets is all 11 rules — every single
 *     rule in this preset duplicates AT LEAST ONE flagship's own coverage.
 *     There is no rule here that is simultaneously non-duplicate against
 *     both `recheck/google` and `recheck/microsoft`; that is the
 *     mathematical consequence of building this preset as their
 *     intersection in the first place.
 *
 * AUDIENCE NOTE, stated plainly rather than left for a user to discover:
 * **this preset provides its full, zero-duplicate value standalone, with
 * `recheck/prose`, or for a project using neither flagship.** Stacked onto
 * exactly ONE flagship, it still adds real value (the gap-fills above) but
 * a majority of its findings will be reported twice, once by each preset,
 * for the same span — expected, not a bug. Stacking it onto BOTH
 * `recheck/google` AND `recheck/microsoft` together adds no net-new
 * coverage at all (every rule duplicates one or the other) — on top of
 * this phase's existing guidance that composing the two flagships together
 * is not recommended in the first place, do not add this preset to that
 * combination expecting new signal.
 *
 * REPLACEMENT WORDING: per spec, single-word forms (`allowlist`, `blocklist`)
 * are used in messages, matching Google's own preference. Microsoft's own
 * guide prefers two-word forms (`allow list`, `block list`) and
 * `recheck/microsoft` ships those — this preset's messages say so
 * explicitly. Since every rule here is detection-only (see below), this
 * choice affects wording only, never a fix.
 *
 * CARRIED-OVER CORRECTIONS (documented here so they are not re-introduced):
 *   - `chubby`/`fat` are technical-precision entries in Google's own guide
 *     (vague resource sizing, imprecise modifiers), never ableist ones —
 *     they do not appear in this preset.
 *   - `unsighted`/`visually challenged` are Google-only terms; not shipped
 *     here (Microsoft's independent "-impaired" terms are also Google-less
 *     and likewise excluded — see PROVENANCE.md).
 *   - Microsoft's accessibility table has 11 rows, and `special needs`
 *     appears twice with two different preferred replacements — a real
 *     self-contradiction on Microsoft's own page. `special needs` is
 *     Microsoft-only (Google's guide never states it) and is not shipped
 *     here regardless.
 *
 * DETECTION-ONLY BY DESIGN, from the start: this is a word-list preset —
 * exactly the shape that produces the auto-fix corruption both flagship
 * presets are structurally guarded against (see google.ts's/microsoft.ts's
 * own "DETECTION-ONLY BY DESIGN" notes for the adversarial-testing
 * evidence). Rather than repeat that audit here, this preset ships
 * detection-only from day one: `buildInclusiveLanguagePreset()`
 * forces `fix: false` onto every rule it returns, the identical mechanism
 * the two flagships use. See `preset-inclusive-plain.test.ts`'s (generalized,
 * live-registry-derived) "no rule in a style-guide/composable preset is
 * fixable" test for the permanent guarantee.
 */

const GOOGLE_WORD_LIST = 'https://developers.google.com/style/word-list';
const GOOGLE_INCLUSIVE_DOCUMENTATION =
  'https://developers.google.com/style/inclusive-documentation';
const MS_BIAS_FREE = 'https://learn.microsoft.com/en-us/style-guide/bias-free-communication';
const MS_MASTER_SLAVE =
  'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/m/master-slave';
const MS_ACCESSIBILITY_TERMS =
  'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/term-collections/accessibility-terms';
const MS_AZ_BLACKLIST =
  'https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/b/blacklist';
const MS_MILITARISTIC_LANGUAGE =
  'https://learn.microsoft.com/en-us/style-guide/militaristic-language';

// -- small builders, mirroring google.ts/microsoft.ts's identical shape --

function swapRule(opts: {
  pairs: Record<string, string>;
  message: string;
  link: string;
  scope?: string | string[];
  ignoreCase?: boolean;
  wordBoundary?: boolean;
  keysAreRegex?: boolean;
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

export function buildInclusiveLanguagePreset(): RecheckConfig {
  const rules: RecheckConfig = {};

  // "Never use [master] in conjunction with slave." / "Don't use. Instead,
  // use alternative terms... such as worker or replica." (Google, C§3.5
  // rows 1-2). Bare "master" is excluded from both flagship presets and
  // from here — too many unrelated legitimate senses (a master's degree,
  // master bedroom, master key, git's old default branch name). Only the
  // unambiguous bare "slave" ships as a swap.
  rules['inclusive-language/slave'] = swapRule({
    pairs: { slave: 'worker' },
    message:
      'Avoid "%s"; use "%s" or "replica" instead (Google C§3.5 row 2; Microsoft a-z/master-slave agrees the pairing itself must be avoided).',
    link: `${GOOGLE_WORD_LIST}#slave`,
    ignoreCase: true,
    wordBoundary: true,
  });

  // The compound "master/slave" pairing itself — Google's own quote scopes
  // its objection here ("in conjunction with slave"), and Microsoft's
  // dedicated a-z/master-slave page targets exactly this compound. The two
  // guides disagree on the REPLACEMENT (bias-free-communication says
  // "primary/subordinate"; a-z/master-slave leads with "primary/replica",
  // also sanctioning primary/secondary, principal/agent, controller/worker)
  // so — matching `microsoft/master-slave`'s own resolution of the same
  // disagreement — this ships as `pattern`, prescribing no single target.
  rules['inclusive-language/master-slave-pairing'] = patternRule({
    tokens: ['\\bmaster\\s*/\\s*slave\\b', '\\bmaster-slave\\b'],
    message:
      'Avoid the "%s" pairing (Google C§3.5 row 1; Microsoft a-z/master-slave); both guides agree to avoid it but recommend different replacements — e.g. "primary/replica" or "primary/subordinate".',
    link: MS_MASTER_SLAVE,
    ignoreCase: true,
  });

  // Noun forms only — both guides separately caution that the VERB forms
  // ("blacklisted the domain", "whitelist an email address") don't take a
  // word-for-word replacement cleanly (Google: "a simple word-for-word
  // replacement typically isn't the best solution"; Microsoft ships this
  // exact caution as its own `az-verb-able` rule). Single-word replacement
  // per spec (`denylist`/`allowlist`), with the two-word Microsoft
  // preference noted in the message.
  rules['inclusive-language/blacklist-whitelist'] = swapRule({
    pairs: { blacklist: 'denylist', whitelist: 'allowlist' },
    message:
      'Use "%s" instead of "%s" (Google C§3.5 rows 3-4; Microsoft a-z/blacklist agrees but prefers the two-word "block list"/"allow list" forms — recheck/microsoft ships those). Verb forms need a rewrite, not a word-for-word swap.',
    link: MS_AZ_BLACKLIST,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "Don't use. Instead, use a more precise term like perimeter network."
  // (Google C§3.5 row 26) / "Don't use. Use perimeter network instead."
  // (Microsoft a-z/demilitarized-zone-dmz) — the rare case where both
  // guides agree on the exact SAME replacement too.
  // `DMZ` is anchored against the real Korean-border sense ("the DMZ
  // dividing North and South Korea"), the same guard `microsoft/DMZ`
  // rules already carry after that exact corruption was found and fixed.
  rules['inclusive-language/dmz'] = patternRule({
    tokens: [
      '\\bDMZ\\b(?!\\s+(?:dividing|between|separating)\\b)',
      '\\bdemilitarized zone\\b(?!\\s+(?:dividing|between|separating)\\b)',
    ],
    message:
      'Avoid "%s"; use "perimeter network" instead (Google C§3.5 row 26; Microsoft a-z/demilitarized-zone-dmz — both guides recommend the identical replacement).',
    link: MS_BIAS_FREE,
  });

  // "Don't use. Instead, use unavailable." (Google C§3.5 row 20). Microsoft's
  // a-z/gray-grayed-out page: "Don't use gray or grayed out to describe
  // commands or options that are in an unusable state—use not available or
  // isn't available instead. Use appears dimmed if you must describe their
  // appearance." — both guides agree the JARGON TERM "grayed out"/"greyed
  // out" itself should be avoided when describing an unusable UI state;
  // "unavailable" is Google's own stated replacement and lines up with
  // Microsoft's "not available"/"isn't available" family closely enough to
  // serve as a safe default swap target.
  //
  // "Shaded" is deliberately NOT listed as an alternate phrasing for
  // "grayed out": the live Microsoft page reserves "shaded" for a narrower,
  // different case ("Use shaded to describe the appearance of checkboxes
  // that represent a mixture of settings") — Microsoft's own recommended
  // term for mixed-state (indeterminate) checkboxes, not a synonym for the
  // unusable/dimmed state this rule targets. See `presets/microsoft/
  // PROVENANCE.md`'s "shaded" entry for the same distinction.
  rules['inclusive-language/grayed-out'] = swapRule({
    pairs: { 'grayed-out': 'unavailable', 'greyed-out': 'unavailable' },
    message:
      'Use "%s" instead of "%s" (Google C§3.5 row 20; Microsoft a-z/gray-grayed-out agrees the term itself should be avoided when describing an unusable UI state, preferring "not available"/"isn\'t available").',
    link: `${GOOGLE_WORD_LIST}#grayed-out`,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "don't use he/she or (s)he or other such punctuational approaches.
  // Instead, use the singular they." (Google, pronouns page via D.md/C.md
  // context) / "Don't use constructions like he/she and s/he." (Microsoft
  // bias-free-communication, V23). Both name the exact same two strings.
  rules['inclusive-language/he-she'] = swapRule({
    pairs: { 'he/she': 'they', 's/he': 'they' },
    message:
      'Use "%s" instead of "%s" (Google pronouns page; Microsoft bias-free-communication V23).',
    link: MS_BIAS_FREE,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "Don't describe people without disabilities as normal or healthy...
  // instead, use nondisabled person, sighted person, hearing person, person
  // without disabilities, or neurotypical person." (Google inclusive-
  // documentation, D§3.6 row 45) / Microsoft accessibility table Row 5:
  // "Person without a disability" (preferred) / "Non-disabled person,
  // able-bodied person" (acceptable) for the SAME "normal person"/"healthy
  // person" avoid-phrases — matched phrase-level (never bare `normal`),
  // the same collision-avoidance both guides' own text and
  // `microsoft/accessibility-terms` already establish: bare `normal` also
  // means a statistical "normal distribution" or "normalize a value",
  // senses neither guide addresses.
  rules['inclusive-language/nondisabled-person'] = swapRule({
    pairs: {
      'normal person': 'person without a disability',
      'healthy person': 'person without a disability',
    },
    message:
      'Use "%s" instead of "%s" (Google inclusive-documentation D§3.6 row 45; Microsoft accessibility term collection Row 5).',
    link: GOOGLE_INCLUSIVE_DOCUMENTATION,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "such as victim of, suffering from... instead, use... experiencing,
  // living with." (Google inclusive-documentation, D§3.6 row 43) /
  // "Don't use words that imply pity, such as stricken with or suffering
  // from." + accessibility Row 4's "suffers from"/"a victim of" (Microsoft).
  // Only the two Google-confirmed phrases ship here — Microsoft's
  // "affected by"/"stricken with" are Microsoft-only (not stated on
  // Google's page), so they stay out per the intersection principle.
  rules['inclusive-language/suffering-victim'] = swapRule({
    pairs: { 'suffering from': 'experiencing', 'victim of': 'living with' },
    message:
      'Use "%s" instead of "%s" (Google inclusive-documentation D§3.6 row 43; Microsoft accessibility term collection Row 4 agrees this phrase should be avoided, though its own replacement is sometimes a fuller sentence rewrite).',
    link: GOOGLE_INCLUSIVE_DOCUMENTATION,
    ignoreCase: true,
    wordBoundary: true,
  });

  // "Avoid euphemisms or patronizing terms such as physically challenged...
  // special... differently abled... handi-capable." (Google inclusive-
  // documentation, D§3.6 row 44, DETECT-ONLY — no replacement given) /
  // Microsoft accessibility table Row 8: "differently abled" in the
  // Do-not-use column, preferred "person with cognitive disabilities,
  // developmental disabilities, learning disabilities, or dyslexia". Only
  // "differently abled" is the exact shared string; Google's other three
  // synonyms in the same row (physically challenged, special, handi-
  // capable) are not independently confirmed on Microsoft's page, so they
  // stay out. Detection-only with no forced replacement (not a `swap`):
  // the two guides scope this euphemism to different specific disabilities,
  // so no single replacement string is correct for every occurrence.
  rules['inclusive-language/differently-abled'] = patternRule({
    tokens: ['\\bdifferently[- ]abled\\b'],
    message:
      'Avoid the euphemism "%s" (Google inclusive-documentation D§3.6 row 44; Microsoft accessibility term collection Row 8); use specific, person-first language instead.',
    link: MS_ACCESSIBILITY_TERMS,
    ignoreCase: true,
  });

  // Google word-list#cripple: figurative sense — "instead of it crippled
  // the server, write it slowed the server down" (CONFIRMED); person sense
  // — "person with a mobility impairment" and other person-first
  // alternatives (CONFIRMED, D§3.6 row 27). Microsoft accessibility table
  // Row 2: "crippled" in the Do-not-use column, preferred "person with
  // limited mobility, person who has a mobility or physical disability".
  // Detection-only with no forced replacement (not a `swap`): the two
  // guides give different alternative sets for the figurative vs.
  // person-reference senses, and `microsoft/accessibility-terms` already
  // ships this bare and unguarded (no demonstrated unrelated collision).
  rules['inclusive-language/crippled'] = patternRule({
    tokens: ['\\bcripple\\b', '\\bcrippled\\b'],
    message:
      'Avoid "%s" (Google word-list#cripple D§3.6 row 27; Microsoft accessibility term collection Row 2); use "slowed down" for a figurative/system sense, or person-first language when referring to a person.',
    link: MS_ACCESSIBILITY_TERMS,
    ignoreCase: true,
  });

  // "Don't use. Instead use remove or attack." (Google word-list#nuke,
  // C§3.5) / Microsoft's militaristic-language "Never use" list explicitly
  // names "nuke, go nuclear" — the one term this preset draws from
  // Microsoft's militaristic list, since no other Google-confirmed term
  // overlaps it.
  rules['inclusive-language/nuke'] = swapRule({
    pairs: { nuke: 'remove' },
    message:
      'Avoid the violent-metaphor jargon "%s"; use "%s" or "attack" instead (Google word-list#nuke C§3.5; Microsoft militaristic-language "Never use" list agrees).',
    link: MS_MILITARISTIC_LANGUAGE,
    ignoreCase: true,
    wordBoundary: true,
  });

  // ==========================================================================
  // DETECTION-ONLY BY DESIGN: structural override, not a per-rule policy —
  // identical mechanism to `buildGooglePreset()`/`buildMicrosoftPreset()`'s
  // own loop. Every rule above already omits `fix: true` (none of the
  // builders here even accept it), but this loop is the single point of
  // truth a future contributor cannot quietly bypass by adding a new rule
  // and forgetting to think about fix-safety at all.
  // ==========================================================================
  for (const rule of Object.values(rules)) {
    rule.fix = false;
  }

  return rules;
}
