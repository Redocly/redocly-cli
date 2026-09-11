# Provenance: `recheck/plain-language`

Source: US federal plain-language guidance, as actually LIVE today —
`https://digital.gov/guides/plain-language` and its subpages, plus the OMB
Memo M-11-15 PDF (`whitehouse.gov`). Public domain: no CC-BY attribution
constraint, but pages are cited here (and in each rule's `link:`) for
auditability. Sync/verification date: **2026-07-30**.

Modification note: rules are adapted to Recheck's assertion vocabulary
(`length`, `swap`, `pattern`); wording is paraphrased into each rule's
`message`, not quoted verbatim. Every rule carries a `link:` to its source
page.

## `plainlanguage.gov` is dead

Every path under `plainlanguage.gov` — `/guidelines/words/simple-words-
phrases/`, `/guidelines/sentences/`, `/guidelines/paragraphs/`, even the
classic `/media/FederalPlainLanguageGuidelines.pdf` — now issues an HTTP 301
to a single, much thinner overview page: `https://digital.gov/guides/plain-
language`. That page itself states its content is "adapted from
PlainLanguage.gov" and that the original site survives only "archived in the
PlainLanguage.gov GitHub repository" — a non-`.gov` domain, and therefore
**not used as a source** here, per the verification's own `.gov`-only rule.
Every citation below is what is actually live on `digital.gov`,
`plainlanguage.gov` (the redirect target), or `whitehouse.gov` (the OMB PDF)
as of 2026-07-30.

## Method

`curl -sL` (redirects followed) fetched every page; a small local Python 3
script (`extract.py`, regex-based tag stripping + `html.unescape`, no
summarizing tool) parsed the result, preserving block structure as line
breaks; tables were re-parsed directly from raw HTML `<tr>/<td>` structure.
The one PDF (OMB Memo M-11-15) was read directly via a native PDF reader, not
summarized. **No `WebFetch` or other summarizing tool was used at any
point** — the same discipline this phase's provenance work requires
everywhere else, after the fabrication incident that motivated it.

## `sources.json` normalization

`sources.json` records one hash per source page as drift detection for a
future re-check: re-fetch a page later, and a changed digest means the
guide's content changed. The version of this file that shipped before this
correction hashed the raw HTML response directly and claimed digital.gov's
plain-language pages are stable enough for that to work as reproducible
drift detection ("two consecutive fetches of the same URL are
byte-identical"). **That claim does not hold.** On independent re-fetch of
all 9 pages listed in `sources.json`, every recorded `bytes` (raw page
length) matched the live page exactly, but **none** of the 9 recorded raw-
HTML `sha256` values did — a 100% mismatch rate against a claim of
byte-for-byte reproducibility, which is the same shape of unearned
auditability claim already caught and fixed in `recheck/google`'s own
`sources.json` (its raw-HTML hashes failed to reproduce for a different
reason — see that file's own normalization section).

**Cause, found by diffing two raw fetches of the same URL:** unlike
Google's per-request analytics/nonce/feature-flag noise, digital.gov's
instability is not per-request — repeated fetches within one short session
are identical. It is Drupal build/deploy metadata embedded in every
response, outside the guide content: an anonymous-user `permissionsHash`
(a 64-hex-char token inside the inline `<script type="application/json"
data-drupal-selector="drupal-settings-json">` block), Drupal's
asset-aggregation CSS/JS filenames (`css_<hash>.css`, `js_<hash>.js` —
content-hashed per build), and an `ajaxPageState.libraries` deflate+base64
blob describing which asset libraries loaded. All of these regenerate
across Drupal deploys/cache-clears rather than every single request, and
each is a fixed-format token (a hash of a given length, a compressed list
of a given rough size) — so the page's overall byte count stays constant
across a deploy even when the exact bytes don't, which is exactly why the
`bytes` field alone looked reproducible while `sha256` wasn't.

**Fix**: hash the extracted `<main>...</main>` region instead of the full
page — the same fix `recheck/google` and `recheck/microsoft` already
applied for their own per-request/per-build noise. Every one of the
Drupal tokens above was confirmed to live before the opening `<main>` tag
(checked by scanning the extracted region of all 9 pages for any 16+
character hex/base64-like token — zero hits). Reproduction recipe: fetch
the page's HTML with `curl -sL` (redirects followed), take the first
`<main ...>...</main>` match (a non-greedy, dot-matches-newline regex
scan against `[\s\S]`; every page has exactly one), and sha256 the UTF-8
bytes of that substring.

**Reproducibility, verified rather than assumed**: all 9 pages in
`sources.json` were fetched TWICE each, ~80 seconds apart — past this
site's own `cache-control: max-age=60` CDN TTL, so the second fetch is not
guaranteed to be served from cache — and the extracted `<main>` region was
byte-identical (and therefore sha256-identical) both times, for every
page. `bytes` in `sources.json` now records the extracted region's length,
not the raw page's, matching the `recheck/google`/`recheck/microsoft`
convention — a future re-check with a matching `bytes` but a different
`sha256` (or vice versa) is a signal to check whether the extraction shape
itself changed before treating the result as real guide drift.

## THE NUMBER — why no `metric`/readability rule ships

**No live federal plain-language page states a grade level, a Flesch/
readability score, or any other scorable numeric target for prose.** Grepped
for `flesch`, `reading ease`, `readab`, `grade level`, `grade-level`, `grade
point`, `reading level`, `lexile` across all 21 fetched `digital.gov` pages
plus the OMB M-11-15 PDF text — zero numeric hits.

The one grade-level mention that exists is the OPPOSITE of a licensed
target. From `https://digital.gov/guides/plain-language/principles`
("Write for your audience"):

> "Don't write for an 8th-grade class if your readers are PhD candidates,
> small business owners, or working parents."
>
> "Only write for 8th graders if your audience is, in fact, an 8th-grade
> class."

Reporting this as a licensed "8th grade" number would be the exact
fabrication shape flagged elsewhere in this phase (a scorable threshold
attributed to a guide that never published one). The guidance's own testing
method (`https://digital.gov/guides/plain-language/test`) is user testing
(paraphrase testing, usability testing, comparative studies), not an
automated readability formula — there is no algorithmic substitute offered
anywhere on the site. **Verdict: `metric` stays a documented opt-in.** No
change to `DOCUMENTED_OPT_IN_ASSERTIONS` (`presets/index.ts`) or the
README's "Opt-in prose assertions" section.

## Sentence length — no stated number either

Only qualitative advice exists on the live site: "Express only one idea in
each sentence" / "Write short sentences"
(`https://digital.gov/guides/plain-language/writing/clear-short`). No word
count is given for sentences on any live page — no `length` rule ships for
sentences.

## Paragraph length — the one family with real numbers

From the same `clear-short` page:

| Claim                                                                    | Live quote                                                                                    | Shipped as                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Soft target (attributed to "writing experts", not the guide's own voice) | "Writing experts recommend paragraphs of no more than 150 words in three to eight sentences." | `plain-language/paragraph-sentence-count` — `length`, `unit: sentences`, `max: 8`, `severity: warn`. No `min`: a floor over-fires on ordinary, correct single-sentence paragraphs (a short lead-in to a code block, an image caption) — the identical reasoning `microsoft/paragraph-length` already documents for the same family. |
| Hard ceiling, stated in the guide's own unconditional voice              | "Paragraphs should never be longer than 250 words."                                           | `plain-language/paragraph-max-words` — `length`, `unit: words`, `max: 250`, `severity: error` (unconditional, guide-stated — matches the severity policy behind `google/sentence-length`).                                                                                                                                          |

## Word/phrase families shipped

### Filler / wordy phrases

Source: `https://digital.gov/guides/plain-language/writing/style`
("Check your prepositions" table).

| avoid                  | prefer (shipped)        | note                                                                                                                         |
| ---------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| a number of            | several, a few, or many |                                                                                                                              |
| a sufficient number of | enough                  |                                                                                                                              |
| at this point in time  | now                     |                                                                                                                              |
| is able to             | can                     |                                                                                                                              |
| on a monthly basis     | monthly                 |                                                                                                                              |
| on the ground that     | because                 |                                                                                                                              |
| in order to            | to                      | the exact pair the original plan named, confirmed verbatim                                                                   |
| an amount of X         | X                       | templated (variable X) — ships separately as `plain-language/an-amount-of`, detection-only (`pattern`, no fixed replacement) |

**Deliberately NOT shipped: `be responsible for` → `must`.** Live, verbatim
on the same table, but this pairing is an odd 1:1 substitution that
misreads ordinary, correct accountability language ("the team is
responsible for the migration") as wordiness. Unlike the other pairs above,
there is no textual signal distinguishing the guide's intended sense
(padding) from the extremely common correct sense (genuine responsibility) —
excluded rather than shipped noisy.

### Excess intensifiers

Source: `https://digital.gov/guides/plain-language/principles/short-simple`
— a literal cut-list, not paired substitutions: "absolutely, actually,
completely, really, quite, totally, very." Shipped as
`plain-language/excess-intensifiers`, detection-only (`pattern`) — cutting
an intensifier is an editorial call, not a mechanical substitution.

### Complex words / simple substitutes

Source: `https://digital.gov/guides/writing-understanding/familiar-terms`
("Complex words and recommended terms to use instead").

| avoid                | prefer (shipped) |
| -------------------- | ---------------- |
| addressee            | you              |
| assist, assistance   | help             |
| commence             | begin            |
| in order that        | for              |
| in the amount of     | for              |
| in the event of      | if               |
| promulgate           | issue            |
| utilize, utilization | use              |

**Deliberately NOT shipped: `implement` → carry out, start.** Live,
verbatim on this table — but in software/API documentation, "implement an
interface," "implement this endpoint," "implement the spec" is ordinary,
correct technical vocabulary, not wordiness. Flagging it would misfire
across nearly every technical document Recheck targets.

**Deliberately NOT shipped: `this activity, command` → us, we.** This row is
itself a garbled/mismatched pairing on the live page (confirmed live, not an
extraction error, but reads as a stray editorial artifact rather than a
clean semantic pair) — and separately, "command" has a strong, unrelated,
extremely common technical sense (CLI command, terminal command) that is
core developer-docs vocabulary. Excluded on both grounds.

**`shall` never appears anywhere in this preset**, in any family — even
though the SAME `familiar-terms` page, immediately after the table above,
explicitly names it: _"Avoid 'shall' — Use 'must' not 'shall' to impose
requirements. 'Shall' is ambiguous... 'Shall' is an aggressive and outdated
word often used in legal style writing."_ (verified verbatim, live,
2026-07-30). **SHALL is a defined RFC 2119 normative keyword** (alongside
MUST/SHOULD/MAY/MUST NOT) used throughout specifications and API/interface
documentation — exactly Recheck's target content. A rule flagging it would
be actively wrong for that whole document class: RFC 2119 usage is a
different, correct register the federal guidance never anticipated, not an
exception it carves out. This is the single highest-risk exclusion in this
preset, named explicitly in the task's own domain-hazard callout alongside
`implement`
and `command`.

### Redundant pairs (doublets)

Source:
`https://digital.gov/guides/plain-language/principles/short-simple`
("Avoid doublets and triplets... Examples of doublets and recommended
alternatives").

| avoid                     | prefer (shipped)         |
| ------------------------- | ------------------------ |
| Due and payable           | Due                      |
| Cease and desist          | Stop                     |
| Knowledge and information | Knowledge or information |

**Note: "each and every," "null and void," "true and correct," "first and
foremost," "any and all," and "full and complete" do NOT appear anywhere on
the live site** (grepped explicitly, zero hits) — only the three doublets
above are actually live. Do not cite the others as guide-derived if a future
edit touches this family.

**Cease and desist** is also a fixed legal term of art / the name of a
document type ("a cease-and-desist letter"). Shipped anyway (detection-only,
`warn` severity, matching the same risk tolerance `google/black-white-box-
testing` and similar entries already accept for phrase-level matches with a
documented ambiguity) — flagged here rather than silently excluded.

**"Due"** alone is never matched — the swap key is the full phrase "due and
payable", so ordinary uses of bare "due" (due date, due diligence, past due)
are unaffected.

### Double negatives

Source: `https://digital.gov/guides/plain-language/writing/style`
("Examples of recommended alternative terms for double negatives").

| avoid                | prefer (shipped) | mechanism                                                                                                  |
| -------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| has not yet attained | is under         | `swap` (fixed phrase)                                                                                      |
| no fewer than        | at least         | `swap` (fixed phrase)                                                                                      |
| may not … until      | may only … when  | `pattern` (variable text between the two halves in the guide's own quote — can't be a literal-phrase swap) |
| is not … unless      | only if          | `pattern` (same reason)                                                                                    |

### Jargon → everyday language

Source: `https://digital.gov/guides/plain-language/principles/avoid-jargon`
("Consider the following pairs").

| avoid                     | prefer (shipped) |
| ------------------------- | ---------------- |
| Riverine avifauna         | River birds      |
| Involuntarily undomiciled | Unhoused         |

## Families considered and NOT shipped (abstract advice, not concrete pairs)

- **Nominalizations ("hidden verbs")** — the live page
  (`https://digital.gov/guides/plain-language/writing`) gives only two
  full-sentence before/after examples ("We conduct an analysis of the
  data." → "We analyze data."; "We are responsible for management of the
  program." → "We manage the program.") plus a morphological pattern
  (suffixes `-ment`, `-tion`, `-sion`, `-ance` combined with link verbs
  achieve/effect/give/have/make/reach/take). That pattern is not safely
  concrete: ordinary, entirely correct nouns sharing those suffixes
  ("chance", "moment", "information", "attention", "decision" used plainly,
  "assurance", "distance") would false-positive constantly under any
  verb+suffix pattern rule — a materially worse hit rate than the excluded
  word-level pairs above. Omitted rather than shipped noisy.
- **Sentence-length numeric rule** — no word count is stated anywhere on
  the live site; see above.
- **Grade-level/readability `metric` rule** — no number is stated anywhere
  on the live site; see above.
- **Abbreviation count per document** ("Limit the number of abbreviations
  you use in one document to no more than three, preferably two" —
  `https://digital.gov/guides/plain-language/writing/style`). A real,
  quotable number — but it counts DISTINCT abbreviation TYPES per document,
  not total occurrences. Neither `occurrence` nor `length` can express
  "count of distinct matching values" (both count total matches/size), so
  faithfully enforcing this specific number is an engine gap, not a
  judgment call — out of scope for this preset.
- **Paraphrase-testing sample size, testing iteration count** — both are
  user-testing METHODOLOGY recommendations, not document content; not
  something a markdown/prose linter can ever evaluate from text alone.

## Duplicate-finding audit

A composable preset that duplicates a flagship's own findings on the same
span is noise, not value — measured directly with `lintContent` over this
preset's own violations fixture, stacked onto each flagship in turn (see
`preset-composition.test.ts`'s "duplicate findings" describe block for the
live, asserted counts).

Stacking `recheck/plain-language` onto `recheck/google` originally produced
**6** duplicate positions (same file/line/column, 2+ distinct rule names);
onto `recheck/microsoft`, **5**. Two pairs accounted for 3 of those on each
side and are REMOVED as a result:

| Removed pair                    | Was in                          | Already shipped, identically, by                  |
| ------------------------------- | ------------------------------- | ------------------------------------------------- |
| `in order to` → `to`            | `plain-language/filler-phrases` | `google/in-order-to` AND `microsoft/simple-words` |
| `utilize`/`utilization` → `use` | `plain-language/complex-words`  | `google/utilize` AND `microsoft/simple-words`     |

Both are removed outright, not merely documented as an accepted overlap:
they add zero coverage for anyone already running either flagship, and a
user running neither flagship loses nothing meaningful by their absence —
these are common enough words that a project without either flagship
almost certainly has its own opinion, or none, either way. This is the
general rule of thumb for this class of overlap: prefer removal when the
flagship's coverage is genuinely equivalent (same phrase, same
replacement), which both of these are.

**3** duplicate positions remain against each flagship (google+plain-
language: 3 of 35 total problems on the violations fixture;
microsoft+plain-language: 3 of 35). These are KEPT, not removed, because
they are not content-equivalence — each is either:

1. **The accepted paragraph-length overlap** — `plain-language/paragraph-
max-words` and `plain-language/paragraph-sentence-count` always co-fire
   on the same long paragraph (that's two independently-sourced numbers,
   words vs. sentences, both real); against `recheck/microsoft`
   specifically, `microsoft/paragraph-length` (a DIFFERENT number, 7
   sentences vs. this preset's 8, sourced from Microsoft's own distinct
   "3-7 lines" proxy) joins that overlap too. See plain-language.ts's file
   header for why this one is a deliberate keep, not an oversight.
2. **A coincidental substring collision with `use-contractions`** — this
   preset's own `has not yet attained`/`is not … unless` double-negative
   content happens to contain the literal substrings "has not"/"is not",
   which both flagships' own `use-contractions` rule ALSO flags (toward
   "hasn't"/"isn't") for a completely unrelated reason (contraction
   preference, not double-negative wordiness). This is not a design
   overlap between the two presets' actual TERM LISTS — it is two
   independently-motivated rules that happen to have an opinion about the
   same span of text. Keeping both is correct: removing the double-
   negative content would lose real, unrelated value, and there is no way
   to narrow it to avoid every phrase containing "has not"/"is not"
   without gutting the family.

## Fetch log (2026-07-30, `curl -sL`)

| URL                                                                                                                  | Result                                            |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `https://www.plainlanguage.gov/`                                                                                     | 301 → `https://digital.gov/guides/plain-language` |
| `https://www.plainlanguage.gov/guidelines/words/simple-words-phrases/`                                               | 301 → same target                                 |
| `https://www.plainlanguage.gov/guidelines/sentences/`                                                                | 301 → same target                                 |
| `https://www.plainlanguage.gov/guidelines/paragraphs/`                                                               | 301 → same target                                 |
| `https://www.plainlanguage.gov/media/FederalPlainLanguageGuidelines.pdf`                                             | 301 → same target                                 |
| `https://digital.gov/guides/plain-language`                                                                          | 200                                               |
| `https://digital.gov/guides/plain-language/principles` (+ 4 subpages)                                                | 200                                               |
| `https://digital.gov/guides/plain-language/writing` (+ 4 subpages)                                                   | 200                                               |
| `https://digital.gov/guides/writing-understanding/familiar-terms`                                                    | 200                                               |
| `https://digital.gov/guides/plain-language/design` (+ 5 subpages)                                                    | 200                                               |
| `https://digital.gov/guides/plain-language/test` (+ 3 subpages)                                                      | 200                                               |
| `https://digital.gov/resources/plain-writing-act`                                                                    | 200                                               |
| `https://www.whitehouse.gov/wp-content/uploads/legacy_drupal_files/omb/memoranda/2011/m11-15.pdf` (OMB Memo M-11-15) | 200, read natively as PDF                         |

**Not fetched, and not used as a source**: the PlainLanguage.gov GitHub
archive repository — off-domain, out of scope per the `.gov`-only rule.
