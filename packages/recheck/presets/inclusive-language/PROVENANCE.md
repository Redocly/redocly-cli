# Provenance: `recheck/inclusive-language`

Composable, guide-agnostic preset: the **intersection** of `recheck/google`
and `recheck/microsoft`'s inclusive/bias-free/ableist/accessibility content —
terminology both flagship guides independently state should be avoided.
Sync date: **2026-07-30** (no new fetch; see "How this preset was verified"
below).

Modification note: rules are adapted to Recheck's assertion vocabulary
(`swap`, `pattern`); wording is paraphrased into each rule's `message`, not
quoted verbatim. Every rule carries a `link:` to one of its two source pages
(picked for specificity; the other guide's citation lives in this table and
in the rule's own code comment).

## Shipped rules

All `warn` severity (pure word-choice/terminology, no structural content —
matching both flagships' "word choice → warn" policy) and all detection-only
(`fix: false`, forced structurally — see `inclusive-language.ts`'s header).

| Rule id                                   | Term(s)                               | Google source                                                                                                                                 | Microsoft source                                                                                                                                                        | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------- |
| `inclusive-language/slave`                | `slave`                               | C§3.5 row 2 ("Don't use. Instead, use alternative terms... such as worker or replica.")                                                       | a-z/master-slave (H.md row 46: "Don't use master/slave. Use primary/replica...")                                                                                        | Bare `master` excluded on both sides — too polysemous (master's degree, master key, git branch name); only the unambiguous `slave` ships as a swap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `inclusive-language/master-slave-pairing` | `master/slave`, `master-slave`        | C§3.5 row 1 ("Never use in conjunction with slave... primary, main, original, parent... controller... leader, or active")                     | a-z/master-slave (H.md row 46) + bias-free-communication (E.md V25)                                                                                                     | The two guides disagree on the replacement (primary/replica vs. primary/subordinate) — ships as `pattern`, matching `microsoft/master-slave`'s own resolution of the identical disagreement.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `inclusive-language/blacklist-whitelist`  | `blacklist`, `whitelist` (noun forms) | C§3.5 rows 3-4                                                                                                                                | a-z/blacklist, a-z/whitelist (G.md row 58, H.md row 45)                                                                                                                 | Both guides separately caution the VERB forms don't take a word-for-word swap; message says so. Single-word replacement (`denylist`/`allowlist`) per spec, noting Microsoft's two-word preference.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `inclusive-language/dmz`                  | `DMZ`, `demilitarized zone`           | C§3.5 row 26                                                                                                                                  | a-z/demilitarized-zone-dmz (G.md row 61) + bias-free-communication                                                                                                      | Rare exact match: both guides recommend the identical replacement, "perimeter network". Anchored against the real Korean-border sense (`(?!\s+(?:dividing                                                                                                                                                                                                                                                                                                                                                                                                                                                          | between | separating)\b)`), the same guard already proven necessary in `microsoft/bias-free-terms`. |
| `inclusive-language/grayed-out`           | `grayed-out`, `greyed-out`            | C§3.5 row 20                                                                                                                                  | a-z/gray-grayed-out (G.md row 112)                                                                                                                                      | Microsoft's own page: "Don't use gray or grayed out to describe commands or options that are in an unusable state—use not available or isn't available instead" — the shared conclusion is that the JARGON TERM itself should be avoided; Google's "unavailable" ships as the default replacement text. **Not** "shaded": the live page reserves "shaded" for describing the appearance of checkboxes that represent a mixture of settings, a narrower, different case, not a general alternate phrasing for "grayed out" (same distinction `recheck/microsoft`'s own PROVENANCE.md draws for its "shaded" entry). |
| `inclusive-language/he-she`               | `he/she`, `s/he`                      | Google pronouns page (via C/D.md context)                                                                                                     | bias-free-communication V23 (E.md): "Don't use constructions like he/she and s/he."                                                                                     | `(s)he` and "his or her" are NOT independently Microsoft-confirmed as literal banned strings (V23's own caveat) — left out.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `inclusive-language/nondisabled-person`   | `normal person`, `healthy person`     | D§3.6 row 45 (inclusive-documentation): "Don't describe people without disabilities as normal or healthy"                                     | Microsoft accessibility table Row 5: "Person without a disability" preferred / "Non-disabled person, able-bodied person" acceptable                                     | Matched phrase-level, never bare `normal`/`healthy` — both guides' own text (and `microsoft/accessibility-terms`'s collision note) flag the statistical/wellness senses of the bare words as unrelated and unaddressed.                                                                                                                                                                                                                                                                                                                                                                                            |
| `inclusive-language/suffering-victim`     | `suffering from`, `victim of`         | D§3.6 row 43 (inclusive-documentation): "such as victim of, suffering from... instead, use... experiencing, living with"                      | Microsoft accessibility table Row 4 ("suffers from", "a victim of" in Do-not-use column) + bias-free V28                                                                | Microsoft's own replacement for Row 4 is sometimes a fuller, condition-specific sentence rewrite, not a literal swap — message notes this. Microsoft's "affected by"/"stricken with" (also Row 4) are NOT Google-confirmed and are excluded.                                                                                                                                                                                                                                                                                                                                                                       |
| `inclusive-language/differently-abled`    | `differently abled`                   | D§3.6 row 44 (inclusive-documentation, DETECT-ONLY, no replacement given): "physically challenged, special, differently abled, handi-capable" | Microsoft accessibility table Row 8 (Do-not-use column), preferred "person with cognitive disabilities, developmental disabilities, learning disabilities, or dyslexia" | Only "differently abled" is the exact shared string across the two guides' respective lists; Google's other three synonyms in the same row are not independently Microsoft-confirmed. Detection-only, no forced replacement: the two guides scope this euphemism to different specific disabilities.                                                                                                                                                                                                                                                                                                               |
| `inclusive-language/crippled`             | `cripple`, `crippled`                 | D§3.6 row 27 (word-list#cripple): figurative → "slowed down"; of-person → person-first alternatives                                           | Microsoft accessibility table Row 2 (Do-not-use column), preferred "person with limited mobility, person who has a mobility or physical disability"                     | Detection-only, no forced replacement — the two guides give different alternative sets for the figurative vs. person-reference senses. `microsoft/accessibility-terms` already ships `crippled` bare/unguarded with no demonstrated unrelated collision; this preset does the same for both `cripple` and `crippled`.                                                                                                                                                                                                                                                                                              |
| `inclusive-language/nuke`                 | `nuke`                                | C§3.5 (word-list#nuke): "Don't use. Instead use remove or attack."                                                                            | Militaristic-language "Never use" list (E.md V26): "...nuke, go nuclear..."                                                                                             | The one term drawn from Microsoft's militaristic list. No other Google-confirmed term overlaps that list.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## Excluded (single-guide coverage — the intersection principle)

These terms are `CONFIRMED` on only ONE guide's side, so they are left out —
shipping them here would make this preset silently guide-specific rather than
composable onto either flagship:

**Google-only** (no Microsoft evidence found in any verification pass):
`graylist`/`greylist`, `blackhat`/`whitehat`/`grayhat`, `blackhole` (verb),
`black-box`/`white-box`/`gray-box` testing (Microsoft's own "black box: never"
entry is a general A-Z word-choice row, not bias-free/accessibility-themed —
see "Also excluded" below), `white label`, `white glove`, `grandfathered`,
`guys`/`you guys`, `gypsy`, `ghetto`, `ninja`, `guru`, `sherpa`, `dojo`, `mom
test`/`grandma test`/`girlfriend test`, `monkey test`, `brown bag`, `build
cop`/`build sheriff`, `war room`, `tribal knowledge`, `native` (of people),
`first class`/`first-class citizen`, `male adapter`, `female adapter`, `man
hours`, `manmade`/`man made`, `manned`, `man-in-the-middle`/MITM,
`preferred pronouns`, `final solution`, `denigrate`, `target` (verb, of
people), `webmaster`, `sexy`, `voodoo`, `holiday`/`Black Friday`/`Cyber
Monday`, `the elderly`/`the aged`/`senior citizens`, `the disabled`, `a
quadriplegic`, `wheelchair-bound`, `unsighted`/`visually challenged` (these
resolve to `blind`'s person-reference alternatives, never its figurative
ones — moot here since Microsoft doesn't independently confirm either term),
`crazy`/`bonkers`/`mad`/`lunatic`/`insane`/`loony`, `sane`, `sanity check`,
`retarded`, `dumb down`, `dummy variable`, `blind to`/`blind eye to`.

**Microsoft-only** (no Google evidence found): `chairman`/`chairwoman`,
`mankind`, `manpower`, `salesman`/`salesmen` (Microsoft's own bias-free page,
V24 — Google's guide never states these), `screened subnet` (paired with DMZ
on Microsoft's page but not independently on Google's), `sight-impaired`,
`vision-impaired`, `hearing-impaired` (Google's own, DIFFERENT terms —
`unsighted`/`visually challenged` — are the Google-side equivalent family,
but the literal strings differ, so neither side's term is shipped here),
`dumb`, `mute`, `non-verbal`, `an epileptic`, `maimed`, `missing a limb`,
`birth defect`, `Special Ed person`, `stupid`, `slow learner`, `mentally
handicapped`, `special needs` (appears TWICE on Microsoft's own 11-row table
with two different preferred replacements — a real self-contradiction on
Microsoft's own page — moot here regardless since Google never states it),
`handicapped`/`the handicapped`/`people with handicaps`, `lame` (excluded on
Microsoft's own preset too, for colliding with "lame excuse"/"lame joke" —
the same reasoning applies here even though it happens to be
Microsoft-only), `Asperger's`.

## Also excluded (present in both guides' broader word lists, but not shipped

here as inclusive-language)

- **`disable`/`disabled` (of a broken/malfunctioning system)** — Google
  confirms (word-list#disable: "use inactive, unavailable, deactivate, turn
  off, or deselect") and Microsoft confirms (a-z/disable-disabled: "Use turn
  off") a narrow ableist-metaphor sense (describing something as "disabled"
  to mean broken). **Deliberately not shipped**: `disable`/`disabled` is
  core, ubiquitous, entirely correct technical vocabulary in exactly the
  corpus Recheck targets ("disable this feature", "the API is disabled",
  feature flags) — a bare-word rule would misfire on nearly every API
  document that describes turning something off, a worse false-positive
  profile than the `shall`/`implement`/`command` hazard the plain-language
  preset's header calls out. The guide's actual "avoid" case (describing
  something as broken, not merely off) has no reliable textual signal to
  anchor against.
- **`hang`/`hung` (of a system)**, **`healthy` (of a system)** — present in
  both Google's word-list (word-list#hang, word-list#healthy) and
  Microsoft's general A-Z word list ("hang, hangs -> stop responding",
  SUBSTRING-RISK-flagged). Excluded here because, looked at independently,
  this is general word-choice/precision content on BOTH sides (not sourced
  from either guide's bias-free-communication/inclusive-documentation/
  accessibility pages) — `recheck/google`'s own PROVENANCE.md independently
  excludes both for the identical polysemy reason ("hung the picture", "hung
  jury", "a healthy amount of caution", "healthy competition").
- **`black box`** (bare, general sense) — Google's C§3.5 entry is
  explicitly framed as inclusive language (alongside blacklist/whitelist);
  Microsoft's matching A-Z row ("black box | never | DETECT-ONLY") is a
  general word-choice entry with no bias-free/accessibility framing found in
  any source. Left out for the same reason as `hang`/`healthy` above — only
  one side's citation is actually inclusive-language-themed.

## How this preset was verified

Every term shipped here was already confirmed against a live page while
verifying `recheck/google`'s inclusive/ableist-language content and
`recheck/microsoft`'s bias-free, militaristic-language, and
accessibility-terms content — no separate web fetch was needed for this
preset. This file was built by taking the **intersection** of those existing
results: a term ships here only if it is independently `CONFIRMED` on at
least one Google source AND at least one Microsoft source. Where only one
guide covers a term, it is listed in "Excluded" above with the reason — that
asymmetry is what keeps this preset safely composable onto _either_ flagship
without duplicating or contradicting either one's own word list.

### Duplicate-finding audit

Unlike `recheck/plain-language` (where two clean single-phrase duplicates
were found and removed — see its own PROVENANCE.md), this preset's overlap
with the flagships is NOT a removable defect: it is the direct, unavoidable
consequence of building it as their intersection in the first place. Every
term shipped here is, by construction, already confirmed by at least one of
the two flagship reports — which usually means it is already SHIPPED by
that flagship's own preset too.

Measured directly with `lintContent` over this preset's own violations
fixture (`inclusive-language-violations.md`, which exercises all 11 shipped
rules), stacked onto each flagship in turn (see `preset-composition.test.ts`'s
"duplicate findings" describe block for the live, asserted counts):

| Stacked with        | Total problems | Duplicate positions | Rules that duplicate                                                                                                  | Rules that are net-new                                                                  |
| ------------------- | -------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `recheck/google`    | 32             | **11**              | `slave`, `blacklist-whitelist`, `grayed-out`, `he-she`, `dmz`, `nuke`, `suffering-victim` (7 of 11)                   | `master-slave-pairing`, `nondisabled-person`, `differently-abled`, `crippled` (4 of 11) |
| `recheck/microsoft` | 27             | **8**               | `dmz`, `master-slave-pairing`, `nondisabled-person`, `differently-abled`, `crippled`, `blacklist-whitelist` (6 of 11) | `slave`, `grayed-out`, `he-she`, `suffering-victim`, `nuke` (5 of 11)                   |

**The union of the two "duplicates" columns is all 11 rules.** There is no
rule in this preset that is simultaneously non-duplicate against BOTH
flagships — every single one duplicates at least one of them. This is
mathematically inevitable, not a quality gap to fix by trimming: trimming
the rules that duplicate Google would gut the preset's value for Microsoft
users and vice versa, and there is no third option that keeps the
intersection's whole reason for existing (cross-guide agreement) while being
simultaneously novel against either specific flagship alone.

**Decision, stated plainly rather than left for a user to discover**: this
preset's full, zero-duplicate value is realized STANDALONE, alongside
`recheck/prose`, or on a project using neither flagship. Stacked onto
exactly one flagship, it still adds real value — the "net-new" columns above
are genuine gaps that flagship's own editorial pass left out — but a
majority of its findings (7 of 11 with Google, 6 of 11 with Microsoft) will
be reported twice, once by each preset, for the same span. This is expected
behavior, documented here and in the preset's own file header and the
README, not a defect. Stacking it onto BOTH `recheck/google` AND
`recheck/microsoft` together adds no net-new coverage at all (the union
above is complete) — combined with this phase's existing guidance that
composing the two flagships together is not recommended in the first place,
this preset should not be reached for in that combination expecting new
signal either.

### Carried-over corrections

- `chubby`/`fat` are Google's own **technical-precision** entries (vague
  resource sizing, imprecise modifiers), never ableist ones — Google's
  entries never mention people. Not shipped here (and Google-only besides).
- `unsighted`/`visually challenged` resolve to the `blind` entry's
  **person-reference** alternatives, never its figurative ones — not shipped
  here regardless, since Microsoft doesn't independently confirm either
  term.
