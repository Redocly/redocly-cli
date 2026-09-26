# Provenance: `recheck/google`

Source: [Google developer documentation style guide](https://developers.google.com/style)
(canonical URL: `https://developers.google.com/style`). License:
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Sync date: **2026-07-29**.

Modification note: rules are adapted to Recheck's assertion vocabulary
(`swap`, `pattern`, `capitalization`, `length`, plus a handful of
markdownlint-parity/Recheck-original token rules); wording is paraphrased
into each rule's `message`, not quoted verbatim from the guide. Every rule
carries a `link:` to its source page.

## How this table was produced

Five independent verification passes fetched the live guide directly
(`curl`, not a summarizing fetch) and confirmed or rejected each candidate
rule against the raw page text/HTML: four slice verifiers (`task-9-verify-A.md`
covering style guide §2.1-2.5, `task-9-verify-B.md` §2.6-2.10,
`task-9-verify-C.md` §3.1-3.5, `task-9-verify-D.md` §3.6-3.9) plus one
cross-check pass that re-parsed the word-list page with a stricter HTML5
parser and diffed every replacement value quoted by the other four
(`task-9-verify-crosscheck.md`). Together they checked ~380 candidate
rules/entries and found **6 fabrications** — rules that appeared in an
earlier research draft but do not exist anywhere on the live guide (see
"Fabrications" below). This preset is built **only** from entries those
five reports marked `CONFIRMED`; nothing here was sourced from the research
draft directly. Fetch date for the verification passes and for
`sources.json`'s hashes is the same day this preset was authored: 2026-07-29.

Every quote below is the verifier's own quote (or fetch-log citation),
reproduced here at second hand — see the verifier reports themselves for
the full text and additional context.

## Shipped rules

Severity policy: `error` is reserved for rules checking pure document
STRUCTURE (heading hierarchy/uniqueness, list-item mechanics, table
mechanics, link placement, alt-text presence, sentence length) where a
violation is unambiguous and mechanical; every word-choice, terminology,
punctuation-convention, and phrasing rule is `warn`. This is a
simplification of spec §2's severity table (which gives a shorter, purely
illustrative example list) applied uniformly here for predictability, at
the cost of a few punctuation-mechanics rules (Oxford comma, en dash,
single-space-between-sentences) that could arguably also be `error` — see
"Author's judgment calls" at the end of this document.

Four shipped rules are named exceptions to that split, not silent
inconsistencies with it: `no-code-in-heading` is heading-scoped (in the
STRUCTURE family above by location) but ships at `warn` because the guide
states it with hedged wording ("Avoid code items in headings," not
"don't"). `no-numbered-headings` is also heading-scoped and the guide
states it unconditionally ("Don't use numbers in headings..."), but ships
at `warn` because the shipped pattern is a narrowed heuristic (bare
leading ordinals and `Step N`/`Part N` markers only, to keep the
false-positive rate low), not a complete detector of every way a heading
could number a sequence — the rule's confidence is in what it does flag,
not full coverage of the guide's stated principle. `emphasis-style` and
`strong-style` ship at `warn` because the guide states its markup
preference as a recommendation ("we recommend underscores," "it's best to
use double asterisk"), not an unconditional "don't." So the actual policy
is: STRUCTURE, stated by the guide as an unconditional, completely
detectable rule → `error`; everything else — including these four
nominally-structural rules the guide itself hedges, or that need an
intentionally incomplete detection heuristic → `warn`.

### Structural (heading, list, table, link, alt-text, sentence mechanics) — `error`

| Rule id                          | Source URL                                                                                                                     | Quote                                                                                                      | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `google/heading-sentence-case`   | [headings](https://developers.google.com/style/headings)                                                                       | "Use sentence case for all headings and titles."                                                           | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `google/heading-increment`       | [headings](https://developers.google.com/style/headings)                                                                       | "put an `<h3>` tag only under an `<h2>` tag"                                                               | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `google/single-h1`               | [headings](https://developers.google.com/style/headings)                                                                       | "only use a level-1 heading once on a page"                                                                | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `google/first-line-h1`           | [headings](https://developers.google.com/style/headings)                                                                       | "only use a level-1 heading once on a page" (same statement as `single-h1`; see "Author's judgment calls") | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `google/no-duplicate-heading`    | [headings](https://developers.google.com/style/headings)                                                                       | "easier to jump between pages and sections...if the headings...are unique"                                 | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `google/no-trailing-punctuation` | [periods](https://developers.google.com/style/periods)                                                                         | "Don't end headings with periods."                                                                         | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `google/no-empty-headings`       | [headings](https://developers.google.com/style/headings)                                                                       | "Don't use empty headings. Make sure headings are followed by content."                                    | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `google/no-emphasis-as-heading`  | [accessibility](https://developers.google.com/style/accessibility)                                                             | "Tag headings using heading elements."                                                                     | CONFIRMED (nuance: the engine's own token rule excludes a bold/italic lead-in followed by more text in the SAME paragraph, and a bold/italic-only paragraph that ends in required punctuation — but NOT a bold/italic-only paragraph with no ending punctuation whose description follows in a later paragraph, which the guide's own "run-in heading" pattern also permits; see verifier A row 12 and "Known limitations" below) |
| `google/no-link-in-heading`      | [headings](https://developers.google.com/style/headings)                                                                       | "Don't put links in headings."                                                                             | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `google/list-item-capital`       | [lists](https://developers.google.com/style/lists)                                                                             | "Start each list item with a capital letter"                                                               | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `google/no-alt-text`             | [accessibility](https://developers.google.com/style/accessibility)                                                             | "For every image, provide an alt attribute"                                                                | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `google/no-merged-cells`         | [accessibility](https://developers.google.com/style/accessibility) (also [tables](https://developers.google.com/style/tables)) | "Don't merge cells. Don't use colspan or rowspan attributes"                                               | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `google/sentence-length`         | [accessibility](https://developers.google.com/style/accessibility)                                                             | "Try to use fewer than 26 words per sentence."                                                             | CONFIRMED — mapped to the new `length` assertion (`unit: words`, `max: 25`) per spec §5.6's stated-numbers table; this is the first non-prose preset to ship a `length`-backed rule (see "Engine/registry changes" below)                                                                                                                                                                                                         |

### Headings (residual) / lists — `warn`

| Rule id                       | Source URL                                               | Quote                                                  | Verdict                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `google/no-code-in-heading`   | [headings](https://developers.google.com/style/headings) | "Avoid code items in headings."                        | CONFIRMED                                                                                                                                                                                                                                                                                                                                  |
| `google/no-numbered-headings` | [headings](https://developers.google.com/style/headings) | "Don't use numbers in headings to indicate a sequence" | CONFIRMED                                                                                                                                                                                                                                                                                                                                  |
| `google/list-length`          | [lists](https://developers.google.com/style/lists)       | "a single item isn't really a list"                    | CONFIRMED, but the verifier marked this specific line NOT-ENFORCEABLE (descriptive aside, not an imperative rule) — downgraded from the generic "list mechanics" `error` class to `warn` for that reason; ships via `list-length`'s own `min: 2` default, no `max` (Google states no upper bound; the 2-7 range is Microsoft's, spec §5.6) |

### Voice, person, tense, contractions — `warn`

| Rule id                         | Source URL                                                               | Quote                                                                                                                                                | Verdict                                                                                                                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `google/second-person`          | [person](https://developers.google.com/style/person)                     | "use `you` or `your` instead of `we`, `our`, or `us`"                                                                                                | CONFIRMED (organizational-reference exception noted in the rule's message; detection-only). Fix wave A: `ignoreCase: true` replaced with an explicit `We/we/Our/our/Us/us` alternation so it stops also matching the all-caps abbreviation "US" — see "Fix wave A corrections" |
| `google/use-contractions`       | [contractions](https://developers.google.com/style/contractions)         | "we recommend using negation contractions such as isn't, don't, and can't"                                                                           | CONFIRMED (`fix: false`: guide's own "is _not_" emphasis exception)                                                                                                                                                                                                            |
| `google/no-triple-contractions` | [contractions](https://developers.google.com/style/contractions)         | "Don't use three-word contractions such as mightn't've."                                                                                             | CONFIRMED                                                                                                                                                                                                                                                                      |
| `google/no-lets`                | [word-list#lets](https://developers.google.com/style/word-list#lets)     | "Don't use if at all possible."                                                                                                                      | CONFIRMED — citation corrected: the draft cited "contractions", but `let's` is never mentioned there; the quote lives on the word-list page (verifier A row 14)                                                                                                                |
| `google/no-please-note`         | [word-list#please](https://developers.google.com/style/word-list#please) | "Don't use please in the normal course of explaining how to use a product" (the phrase `please note` specifically has no documented exception)       | CONFIRMED. Fix wave A: `fix: false` added — the delete-swap left a capitalization/fragment mess behind ("Please note that X." -> "that X."); see "Fix wave A corrections"                                                                                                      |
| `google/no-please`              | [word-list#please](https://developers.google.com/style/word-list#please) | "Use please only when you're asking for permission or forgiveness...Recommended: If the issue persists, please contact your account representative." | CONFIRMED, **must be DETECT-ONLY, never a swap** — the guide's own recommended example sentence uses "please"; a delete-swap would rewrite text the guide endorses (per task-9-author-corrections.md)                                                                          |

### Timeless documentation — `warn`

| Rule id                      | Source URL                                                                           | Quote                                                                                                                                                                | Verdict                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `google/no-timeless-phrases` | [timeless-documentation](https://developers.google.com/style/timeless-documentation) | "as of this writing, currently, does not yet, eventually, existing, future...latest, new, newer, now, old, older, presently, at present, soon" (full confirmed list) | CONFIRMED, but only 5 of the ~15 confirmed terms are shipped (`as of this writing`, `at present`, `presently`, `does not yet`, `currently`) — the rest are ordinary high-frequency words (`existing`, `future`, `latest`, `new`, `newer`, `now`, `old`, `older`, `soon`, `eventually`, `in the future`) with legitimate everyday uses that would make a blind pattern unusably noisy; see "Author's judgment calls" |

### Latinisms, abbreviations, slang — `warn`

| Rule id                     | Source URL                                                         | Quote                                                                                           | Verdict                                                                                                                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `google/no-latinisms`       | [word-list](https://developers.google.com/style/word-list)         | "Don't use i.e. or e.g."; "Don't use vs. as an abbreviation for versus"                         | CONFIRMED (i.e./e.g./vs. — independently reconfirmed in verifier C's 3.1 slice). Fix wave A: carries only the 3 period-terminated keys now (see "Fix wave A corrections" below for why `aka`/`vice versa` moved out)                                                                                 |
| `google/no-latinisms-plain` | [word-list](https://developers.google.com/style/word-list)         | "aka: Don't use. Instead, write out also known as"; "vice versa: ...use...the other way around" | CONFIRMED, same verification as `google/no-latinisms` above. Split out in Fix wave A (2026-07-29) so these two non-period keys get full `\b...\b` anchoring instead of the period-terminated group's unanchored match — see "Fix wave A corrections"                                                 |
| `google/no-internet-slang`  | [abbreviations](https://developers.google.com/style/abbreviations) | "Don't use internet slang abbreviations such as tl;dr, ymmv, RTFM"                              | CONFIRMED (each also has its own word-list replacement: "To summarize" / "Your results might vary" / "For more information, see...")                                                                                                                                                                 |
| `google/no-via`             | [word-list#via](https://developers.google.com/style/word-list#via) | "Don't use."                                                                                    | CONFIRMED, DETECT-ONLY (no replacement given) — this is the exact term the research file's own provenance note flagged a summarizer once inverted; independently reconfirmed by verifier C and the cross-check                                                                                       |
| `google/abbrev-no-periods`  | [abbreviations](https://developers.google.com/style/abbreviations) | "Don't use periods with acronyms or initialisms."                                               | CONFIRMED                                                                                                                                                                                                                                                                                            |
| `google/us-abbreviation`    | [word-list#US](https://developers.google.com/style/word-list#US)   | "OK to use as an abbreviation for United States. Don't use U.S. or U.S.A."                      | CONFIRMED                                                                                                                                                                                                                                                                                            |
| `google/no-slash-abbrev`    | [slashes](https://developers.google.com/style/slashes)             | "Slashes with abbreviations... Recommended: care of, with / Not recommended: c/o, w/"           | CONFIRMED. Fix wave A: both keys gained a leading-only `\b` (were matching inside "src/output", "www/static", "show/hide", "new/old"); Fix wave C: both also gained a trailing `(?![A-Za-z])` (were matching inside "w/o", "c/oscillator") — see "Fix wave A corrections" / "Fix wave C corrections" |

### Numbers, dates, units — `warn`

| Rule id                     | Source URL                                                                                                                                    | Quote                                                                                                                                                                                           | Verdict                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `google/spell-out-ordinals` | [numbers](https://developers.google.com/style/numbers)                                                                                        | "Not recommended: 1st, 5th, 12th, 43rd"                                                                                                                                                         | CONFIRMED                                                                                                              |
| `google/number-format`      | [numbers](https://developers.google.com/style/numbers) (also [hyphens](https://developers.google.com/style/hyphens) for the "from N-M" token) | "use numerals and the percent sign (%), without a space"; "place a zero in front of the decimal point"; "Recommended: 192x192 / Not recommended: 192 x 192"; "Not recommended: from 8-20 files" | CONFIRMED                                                                                                              |
| `google/date-format`        | [dates-times](https://developers.google.com/style/dates-times)                                                                                | "Not recommended: 12/02/2017"                                                                                                                                                                   | CONFIRMED                                                                                                              |
| `google/time-format`        | [word-list#AM,\_PM](https://developers.google.com/style/word-list#AM,_PM)                                                                     | "use all caps, no periods, and a space before" (AM/PM); "Remove the minutes from round hours" (dates-times page)                                                                                | CONFIRMED — citation corrected: the AM/PM quote lives on the word-list page, not dates-times (verifier B row 63)       |
| `google/rfc-spacing`        | [word-list#RFC](https://developers.google.com/style/word-list#RFC)                                                                            | "use a space between RFC and the number (for example, RFC 2318)"                                                                                                                                | CONFIRMED                                                                                                              |
| `google/data-rate-units`    | [word-list#GBps](https://developers.google.com/style/word-list#GBps)                                                                          | "By convention, we don't use KB/s" (and the other 5 unit pairs)                                                                                                                                 | CONFIRMED — the master research table's "8 pairs" claim was wrong; verified exactly 6 (verifier B row 67, cross-check) |

### Punctuation — `warn`

| Rule id                           | Source URL                                                                 | Quote                                                                                                                 | Verdict                                                                                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `google/no-ampersand`             | [text-formatting](https://developers.google.com/style/text-formatting)     | "Don't use ampersands (&) as conjunctions or shorthand for and."                                                      | CONFIRMED (UI-element exception preserved: pattern requires spaces on both sides, so `AT&T`/`&amp;` are untouched)                                                |
| `google/dash-style`               | [dashes](https://developers.google.com/style/dashes)                       | "En dashes...Don't use. Instead, use a hyphen or the word to."; "Don't put a space before or after it [the em dash]." | CONFIRMED                                                                                                                                                         |
| `google/single-space-sentences`   | [periods](https://developers.google.com/style/periods)                     | "Leave only one space between sentences."                                                                             | CONFIRMED                                                                                                                                                         |
| `google/conjunctive-adverb-comma` | [commas](https://developers.google.com/style/commas)                       | "put a comma after the conjunctive adverb"                                                                            | CONFIRMED — the draft's fourth example ("Nonetheless") is not named on the live page; only the three confirmed examples (otherwise/however/therefore) are shipped |
| `google/comma-before-that`        | [pronouns](https://developers.google.com/style/pronouns)                   | "That introduces a restrictive clause. It isn't preceded by a comma."                                                 | CONFIRMED                                                                                                                                                         |
| `google/neither-nor`              | [word-list#neither](https://developers.google.com/style/word-list#neither) | "Write neither A nor B, not neither A or B."                                                                          | CONFIRMED                                                                                                                                                         |
| `google/no-and-or`                | [slashes](https://developers.google.com/style/slashes)                     | "avoid writing and/or except when space is limited, such as in tables"                                                | CONFIRMED — the table exception is not separately carved out in the rule's scope (see "Known simplifications")                                                    |

### Links — `warn`

| Rule id                       | Source URL                                                                             | Quote                                                                  | Verdict                                                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `google/vague-link-text`      | [cross-references](https://developers.google.com/style/cross-references)               | "Don't use phrases such as this document, this article, or click here" | CONFIRMED (page renamed from `link-text`; content unchanged)                                                                                        |
| `google/no-url-as-link-text`  | [cross-references](https://developers.google.com/style/cross-references)               | "don't use a URL as link text"                                         | CONFIRMED (legal/ToS exception noted, not separately modeled — see "Known limitations" below)                                                       |
| `google/link-intro-about`     | [cross-references](https://developers.google.com/style/cross-references)               | "Don't use on instead of about"                                        | CONFIRMED                                                                                                                                           |
| `google/link-punctuation`     | [cross-references](https://developers.google.com/style/cross-references)               | "don't put the link text in quotation marks"                           | CONFIRMED                                                                                                                                           |
| `google/no-target-blank`      | [cross-references](https://developers.google.com/style/cross-references)               | "Don't force links to open in a new tab or window"                     | CONFIRMED                                                                                                                                           |
| `google/self-reference-terms` | [word-list#documentation](https://developers.google.com/style/word-list#documentation) | "use this document, and not this article, this topic, this doc"        | CONFIRMED (general terminology preference, independent of link text — distinct from `vague-link-text` above, which is scoped to the `link` segment) |

### Text formatting — `warn`

| Rule id                        | Source URL                                                             | Quote                                                             | Verdict   |
| ------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------- | --------- |
| `google/emphasis-style`        | [text-formatting](https://developers.google.com/style/text-formatting) | "we recommend underscores"                                        | CONFIRMED |
| `google/strong-style`          | [text-formatting](https://developers.google.com/style/text-formatting) | "best to use the double asterisk for bold"                        | CONFIRMED |
| `google/no-underline`          | [text-formatting](https://developers.google.com/style/text-formatting) | "Reserve underlining for link text"                               | CONFIRMED |
| `google/no-casing-style-names` | [capitalization](https://developers.google.com/style/capitalization)   | "Don't use a casing style name, such as camel case or snake case" | CONFIRMED |

### Code in text — `warn`

| Rule id                    | Source URL                                                       | Quote                                      | Verdict   |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------------ | --------- |
| `google/no-inflected-code` | [code-in-text](https://developers.google.com/style/code-in-text) | "Don't inflect the name of a code element" | CONFIRMED |

### UI elements and verbs — `warn`

| Rule id                      | Source URL                                                                 | Quote                                                                        | Verdict                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `google/ui-element-quotes`   | [ui-elements](https://developers.google.com/style/ui-elements)             | 'click the "Next" button' (Not recommended example)                          | CONFIRMED                                                                                                                  |
| `google/no-click-on`         | [word-list#click](https://developers.google.com/style/word-list#click)     | "Don't use click on."                                                        | CONFIRMED                                                                                                                  |
| `google/no-hover`            | [word-list#hover](https://developers.google.com/style/word-list#hover)     | "Don't use. Instead use hold the pointer over."                              | CONFIRMED — DETECT-ONLY, not a swap (inflected forms "hovering"/"hovered" don't slot into the replacement phrase)          |
| `google/no-uncheck`          | [word-list#uncheck](https://developers.google.com/style/word-list#uncheck) | "use clear for checkboxes"                                                   | CONFIRMED. Bare `check` and `deselect` are deliberately NOT shipped — see "Author's judgment calls"                        |
| `google/scroll-to`           | [word-list#scroll](https://developers.google.com/style/word-list#scroll)   | "write go to the section, instead of scroll to the section"                  | CONFIRMED (preference, not a flat ban — `fix: false`)                                                                      |
| `google/no-toggle-verb`      | [ui-elements](https://developers.google.com/style/ui-elements)             | "Don't use the word toggle as a verb. Describe the action."                  | CONFIRMED — citation correction: not a word-list entry as the draft implied, but is on the `ui-elements` page (verifier D) |
| `google/keyboard-keys`       | [ui-elements](https://developers.google.com/style/ui-elements)             | "Spell out the names of modifier keys"; "use uppercase instead of lowercase" | CONFIRMED                                                                                                                  |
| `google/chapter-terminology` | [word-list#chapter](https://developers.google.com/style/word-list#chapter) | "Instead, refer to documents, pages, or sections"                            | CONFIRMED, DETECT-ONLY                                                                                                     |

### Plain language and wordiness — `warn`

| Rule id                               | Source URL                                                                               | Quote                                                                                                                                                                                                                                                                                                                                 | Verdict                                                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `google/plain-language-swaps`         | [word-list](https://developers.google.com/style/word-list)                               | "allows_you_to: Don't use. Instead, use lets you"; "enable: Not recommended: ...enables you to..."; "comprise: Don't use. Instead, use consist of..."; "desire: Don't use. Instead, use a word like want or need"; "learnings: Don't use. Instead, refer to knowledge..."; "agnostic: Don't use. Instead, use...platform-independent" | CONFIRMED                                                                                                                  |
| `google/in-order-to`                  | [word-list#in_order_to](https://developers.google.com/style/word-list#in_order_to)       | "Avoid in order to; instead, use to. Use in order to when needed to clarify meaning."                                                                                                                                                                                                                                                 | CONFIRMED (conditional — `fix: false`)                                                                                     |
| `google/utilize`                      | [word-list#utilize](https://developers.google.com/style/word-list#utilize)               | "Use with caution. Don't use utilize when you mean use. It's OK to use utilize... when referring to the quantity of a resource being used."                                                                                                                                                                                           | CONFIRMED, DETECT-ONLY given the documented exception                                                                      |
| `google/leverage`                     | [word-list#leverage](https://developers.google.com/style/word-list#leverage)             | "Avoid using if you mean use... use, build on, or take advantage of."                                                                                                                                                                                                                                                                 | CONFIRMED (`fix: false` — three valid alternatives given)                                                                  |
| `google/performant`                   | [word-list#performant](https://developers.google.com/style/word-list#performant)         | "Avoid where possible. Instead, use a more precise term."                                                                                                                                                                                                                                                                             | CONFIRMED, DETECT-ONLY (no fixed replacement)                                                                              |
| `google/copy-and-paste`               | [word-list#Copy_and_paste](https://developers.google.com/style/word-list#Copy_and_paste) | "Avoid using. Instead, explain what to enter into a field and not how."                                                                                                                                                                                                                                                               | CONFIRMED                                                                                                                  |
| `google/create-a-new`                 | [word-list#Create_a_new](https://developers.google.com/style/word-list#Create_a_new)     | "Avoid using unless you need to distinguish... Instead, use Create a ..."                                                                                                                                                                                                                                                             | CONFIRMED (exception noted; `fix: false`)                                                                                  |
| `google/no-run-the-following-command` | [procedures](https://developers.google.com/style/procedures)                             | "Avoid using run the following command to introduce code. Instead, focus on what the command does."                                                                                                                                                                                                                                   | CONFIRMED                                                                                                                  |
| `google/cons-and-pros`                | [word-list#pros](https://developers.google.com/style/word-list#pros)                     | "cons: Don't use. Instead, use a more precise term, such as disadvantages." / "pros: ...such as advantages."                                                                                                                                                                                                                          | CONFIRMED — only the compound phrase "pros and cons" ships; bare "pros"/"cons" are excluded, see "Author's judgment calls" |

### Product and brand names — `warn`

| Rule id                       | Source URL                                                 | Quote                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Verdict                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `google/product-names`        | [word-list](https://developers.google.com/style/word-list) | "Cloud SDK: Not Google Cloud SDK"; "APIs Explorer: Not API explorer..."; "API key: Not developer key or dev key"; "account name: ...use username"; "curated roles: ...use predefined roles"; "network IP address: ...use internal IP address"; "media type: ...Don't use MIME type"; "curl: Not cURL"; "interconnect type: ...use connection type"; "peering zone: Not peer zone"; "Android-powered device: Not Android device"; "Not...Cloud Platform, or Cloud" (Google Cloud); "Cloud console: Not...Developers Console" | CONFIRMED (each entry individually confirmed in verifier D's §3.4). Fix wave A: `'Cloud console'` gained a `(?<!Google )` lookbehind (self-compounding fix — see "Fix wave A corrections"); `GCP` moved to `google/gcp-name` below. Fix wave C: the lookbehind widened to `(?<![Gg][Oo][Oo][Gg][Ll][Ee]\s+)` (case-insensitive, whitespace-tolerant — see "Fix wave C corrections") |
| `google/gcp-name`             | [word-list](https://developers.google.com/style/word-list) | "Not GCP...(Google Cloud)"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | CONFIRMED, same verification as `google/product-names` above. Split out in Fix wave A (2026-07-29), `fix: false` — see "Fix wave A corrections". Fix wave C: `applyMatchCase` fixed at the engine, `fix: false` REMOVED — see "Fix wave C corrections"                                                                                                                              |
| `google/brand-capitalization` | [word-list](https://developers.google.com/style/word-list) | "Google Play services: Write services in lowercase."; "Google Account, Google Accounts: Capitalize Account."; "Markdown: Always capitalized."; "Material Design: Capitalize each word."; "Search Console: Capitalize each word."                                                                                                                                                                                                                                                                                            | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                           |

### Compound and one-word forms — `warn`

| Rule id                           | Source URL                                                                                                                      | Quote                                                                                                                                                                                                                                                 | Verdict                                                                                                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `google/compound-forms`           | [word-list](https://developers.google.com/style/word-list) (webpage via [hyphens](https://developers.google.com/style/hyphens)) | ~68 individual "Not X" / "X: Not Y" entries, e.g. "email: Not e-mail, Email, or E-mail."; "checkbox: Not check box."; "frontend: Not front-end or front end."                                                                                         | CONFIRMED (verifier C's 3.3 slice: ~68/70 confirmed; see "Fabrications"/"Dropped as unverified" for the 2 that didn't make it). Fix wave A: `colo` moved to `google/colo-form` below; `'in line': 'inline'` dropped (see "Dropped in Fix wave A" above)        |
| `google/colo-form`                | [word-list](https://developers.google.com/style/word-list)                                                                      | "colocate: ...Not co-locate or colo."                                                                                                                                                                                                                 | CONFIRMED, same verification as `google/compound-forms` above. Split out in Fix wave A (2026-07-29), `fix: false` (noun/verb mismatch) — see "Fix wave A corrections"                                                                                          |
| `google/acronym-forms`            | [word-list](https://developers.google.com/style/word-list)                                                                      | "HTTPS: Not HTTPs."; "IPsec: Not IPSec."; "NoSQL: Not No-SQL or No SQL."; "OAuth 2.0: Not OAuth 2, OAuth2, or Oauth."; "microservices: Not micro-services."; "fintech: ...Don't use FinTech or fin-tech."; "ad tech: ...Don't use adtech or ad-tech." | CONFIRMED. `I-O`/`IO` → `I/O` confirmed individually. Fix wave A: `UNICODE`/`IPSEC` moved to `google/acronym-caps-detect-only` below; `SHA1` moved to `google/sha1-form` below; `Microservices` (capitalized form) dropped (see "Dropped in Fix wave A" above) |
| `google/acronym-caps-detect-only` | [word-list](https://developers.google.com/style/word-list)                                                                      | "Unicode: Not UNICODE."; "IPsec: Not...IPSEC."                                                                                                                                                                                                        | CONFIRMED, same verification as `google/acronym-forms` above. Split out in Fix wave A (2026-07-29), `fix: false` (case-preservation round-trip made the fix a permanent no-op) — see "Fix wave A corrections"                                                  |
| `google/sha1-form`                | [word-list](https://developers.google.com/style/word-list)                                                                      | "SHA-1: Not SHA1, except in string literals or enum values, and in hyphenated phrases such as HMAC-SHA1."                                                                                                                                             | CONFIRMED (verifier C row 202). Split out in Fix wave A (2026-07-29), `fix: false` per this file's own header policy for rules with a documented guide exception — see "Fix wave A corrections"                                                                |

### Inclusive language / ableist language / jargon with people references — `warn`

| Rule id                                | Source URL                                                                               | Quote                                                                                                                                  | Verdict                                                                                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `google/master-slave`                  | [word-list#slave](https://developers.google.com/style/word-list#slave)                   | "Don't use. Instead, use alternative terms... such as worker or replica."                                                              | CONFIRMED. Only "slave" ships; bare "master" is deliberately excluded — see "Author's judgment calls"                                                                                                    |
| `google/blacklist-whitelist`           | [word-list#blacklist](https://developers.google.com/style/word-list#blacklist)           | "For the noun blacklist, consider... denylist, excludelist, or blocklist" / "whitelist...consider...allowlist, trustlist, or safelist" | CONFIRMED. Noun forms only — the guide itself says a word-for-word swap isn't the best fix for verb forms                                                                                                |
| `google/black-white-hat`               | [word-list#blackhat](https://developers.google.com/style/word-list#blackhat)             | "Don't use. Instead, use precise terms... such as illegal, unethical, or in violation of rules."                                       | CONFIRMED                                                                                                                                                                                                |
| `google/black-white-box-testing`       | [word-list#black-box](https://developers.google.com/style/word-list#black-box)           | "For monitoring, use synthetic monitoring. For testing, use opaque-box testing."                                                       | CONFIRMED                                                                                                                                                                                                |
| `google/grayed-out`                    | [word-list#grayed-out](https://developers.google.com/style/word-list#grayed-out)         | "Don't use. Instead, use unavailable."                                                                                                 | CONFIRMED                                                                                                                                                                                                |
| `google/grandfathered`                 | [word-list#grandfathered](https://developers.google.com/style/word-list#grandfathered)   | "Instead, use an adjective like legacy or exempt or a verb like made an exception."                                                    | CONFIRMED                                                                                                                                                                                                |
| `google/gendered-terms`                | [word-list#man_hours](https://developers.google.com/style/word-list#man_hours)           | "man hours...Instead use terms like person hours"; "male adapter...use plug"; "he/she...use...they"                                    | CONFIRMED                                                                                                                                                                                                |
| `google/jargon-with-people-references` | [word-list#ninja](https://developers.google.com/style/word-list#ninja)                   | "ninja: Don't use to refer to a person. Instead, use a term such as expert."; "DMZ...use...perimeter network"; and others              | CONFIRMED                                                                                                                                                                                                |
| `google/ableist-figurative-terms`      | [word-list#crazy](https://developers.google.com/style/word-list#crazy)                   | "use complicated, complex, baffling, strange, or unexpected...only for inanimate objects"                                              | CONFIRMED. Restricted to the figurative/inanimate-object sense; "mad" and "hang"/"hung" excluded (see "Author's judgment calls")                                                                         |
| `google/dummy-variable`                | [word-list#dummy-variable](https://developers.google.com/style/word-list#dummy-variable) | "Don't use to refer to placeholders. Instead, use placeholder."                                                                        | CONFIRMED                                                                                                                                                                                                |
| `google/blind-figurative`              | [word-list#blind](https://developers.google.com/style/word-list#blind)                   | "blind to, blind eye to...use more precise terms like ignore, unaware of, disregard, avoid, or reject"                                 | CONFIRMED, restricted to the figurative sense only (the SAME entry also covers "blind writes"/"blind change", real technical terms, deliberately not matched)                                            |
| `google/unsighted-visually-challenged` | [word-list#unsighted](https://developers.google.com/style/word-list#unsighted)           | "Don't use. See blind."                                                                                                                | CONFIRMED — resolved to the PERSON-REFERENCE sense of "blind" (person who is blind/visually impaired/low-vision), NOT the figurative sense above, per task-9-author-corrections.md's explicit correction |
| `google/disability-language`           | [inclusive-documentation](https://developers.google.com/style/inclusive-documentation)   | "avoid terms such as the disabled or a quadriplegic"; "such as victim of, suffering from... instead, use... experiencing, living with" | CONFIRMED                                                                                                                                                                                                |
| `google/technical-jargon-precision`    | [word-list#fat](https://developers.google.com/style/word-list#fat)                       | "use a precise modifier... high-capacity network connection instead of fat connection"                                                 | CONFIRMED — framed as technical-jargon precision, NOT ableist language, per task-9-author-corrections.md: Google's own entries for "chubby"/"fat" never mention people                                   |

## Excluded candidates

Every candidate below was checked by one of the five verification passes
(or, where marked, judged independently by this preset's author) and is
**not** shipped, with the reason. This section exists so "why doesn't
`recheck/google` check X?" has a documented answer instead of looking like
an oversight.

### Fabrications (found nowhere on the live guide) — never ship

| Candidate                              | Why excluded                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flesch-reading-ease` metric threshold | No basis anywhere in the guide — zero hits for flesch/reading-ease/readability/grade-level across every fetched page. The guide states only the qualitative principle ("use simpler words and shorter sentences"). Spec §5.6 and spec:215 independently rule out a `metric` rule in the flagship presets; shipping this would attribute an invented numeric mandate to Google under a CC-BY citation. |
| `respective`/`respectively` → rewrite  | No such headword or rule exists anywhere in the word list or any topic page fetched (verifier C, independently re-confirmed by the cross-check).                                                                                                                                                                                                                                                      |
| `makes use of` → `uses`                | Zero occurrences anywhere in the fetched pages (verifier C, cross-check).                                                                                                                                                                                                                                                                                                                             |
| `query string (not querystring)`       | No entry anywhere on the word-list page or any cited topic page; a targeted search of the guide also returns nothing (verifier C, cross-check).                                                                                                                                                                                                                                                       |
| `real time`/`real-time` noun/verb pair | Zero hits in the parsed text or the raw HTML (verifier B, cross-check).                                                                                                                                                                                                                                                                                                                               |
| `robust` as a caution term             | Does not appear anywhere in the current word list (verifier B, cross-check).                                                                                                                                                                                                                                                                                                                          |

### Dropped as unverified (real principle, no dedicated confirmable entry)

| Candidate                     | Why excluded                                                                                                                                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user name` → `username`      | No dedicated word-list entry; only inferable from `account name → username` and the general closed-compound principle. Per the verification contract, unverified means dropped, not shipped at a lower confidence.                                                   |
| N/A first-reference spell-out | The word-list entry only requires spelling out `N/A`/`NA` on FIRST reference, not a blanket ban — Recheck has no reliable way to track "is this the first reference" positionally across a document, so it's excluded rather than shipped as a (wrong) blanket swap. |

### TOO-RISKY (guide confirms it, but the "avoid" token is too ordinary/polysemous to blind-match)

These are all real, guide-stated preferences; none are shipped because the
literal string is common enough in unrelated, correct usage that a blind
`swap`/`pattern` would generate far more false positives than true ones.

| Candidate                                                                                                                                                            | Why excluded                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `abort`, `kill`, `terminate` → stop/exit/cancel/end                                                                                                                  | Standard, correct technical vocabulary (process signals, transaction aborts, connection termination) with a guide-documented command-line-syntax carve-out a blind swap can't detect.                                                               |
| `execute` → run; `access` (verb); `possible`/`impossible`; `impact` (verb); `interface` (verb); `exploit`; `scale` (bare); `review` (="first read"); `each` (="all") | Each has a real but conditional/sense-scoped ruling; the bare word is common enough in the OTHER (unflagged) sense that a blind match would misfire constantly.                                                                                     |
| `simply`/`simple`, `easy`/`easily`, `quick`/`quickly`, `just`                                                                                                        | The guide's own "try eliminating this word" framing has documented legitimate uses ("just" is explicitly OK "to convey that one approach is simpler"); a blind delete-swap fights the guide's own exception.                                        |
| `America`/`American` (=USA sense)                                                                                                                                    | Scoped to the USA-sense only; "American" (American English, American Express, Latin American) has far more legitimate uses than violations.                                                                                                         |
| `Cloud` (bare, capitalized, standing for Google Cloud); `portal`/`dashboard` (meaning the Google Cloud console)                                                      | The guide explicitly permits lowercase "the cloud" generically, and "portal"/"dashboard" are ordinary words in enormously common non-Google-Cloud technical writing.                                                                                |
| `PostgreSQL`/`Postgres`, `directory`/`folder`, `plain text`/`plaintext`                                                                                              | Context-conditional (match the UI's own wording; CLI vs. GUI; cryptography context only), not a free either-or `consistency` pair — shipping as unconditional would mis-enforce legitimate context-appropriate variation.                           |
| `firewalls` → `firewall rules`                                                                                                                                       | Scoped to Compute Engine/networking documentation only; "outside of [that], the term firewalls is acceptable" per the guide's own text — Recheck can't detect document subject matter.                                                              |
| `deselect` (bare, banned)                                                                                                                                            | **Wrong to ship at all**: `deselect` is Google's own correct/recommended term for NON-checkbox UI elements ("use clear for checkboxes, and deselect for other UI elements"). Only `uncheck` (unambiguously checkbox-only in meaning) is shipped.    |
| bare `check` (verb)                                                                                                                                                  | Extremely polysemous ("check the logs", "check that X is true") — only the unambiguous `uncheck` ships.                                                                                                                                             |
| `hit` (UI click synonym)                                                                                                                                             | "hit" is extremely common in unrelated technical senses (cache hit, rate limit hit); the guide's UI-click sense can't be isolated by a blind pattern.                                                                                               |
| `type` → `enter`                                                                                                                                                     | "type" is one of the most common words in technical prose in unrelated senses (data type, type of X); too ambiguous to match blindly.                                                                                                               |
| `menu item`/`choice`/`option` → `command`                                                                                                                            | "option"/"choice" are common ordinary words far outside the menu-item sense the guide targets.                                                                                                                                                      |
| bare `master`                                                                                                                                                        | Google's own quote scopes the objection to the master/slave PAIRING ("Never use in conjunction with slave"), not the standalone word, which has many unrelated legitimate senses (master's degree, master key, master bedroom). Only `slave` ships. |
| `drag and drop` (as opposed to `click and drag`)                                                                                                                     | Commonly and correctly used as a noun/adjective ("drag-and-drop interface"); only the unambiguous verb phrase `click and drag` ships.                                                                                                               |
| `hang`/`hung` (of a system)                                                                                                                                          | Extremely polysemous outside the system sense ("hung the picture", "hung jury", "hang up the phone").                                                                                                                                               |
| `healthy` (of a system) → responsive                                                                                                                                 | Polysemous even in technical prose ("a healthy amount of caution", "healthy competition").                                                                                                                                                          |
| `mad` (ableist figurative sense)                                                                                                                                     | At least as commonly used to mean "angry", a sense the guide never objects to.                                                                                                                                                                      |
| `abnormal`, `deficient`, `deformed` (of a person)                                                                                                                    | Explicitly "OK to refer to a condition of a computer system"; unscoped, these would misfire on ordinary error-handling prose ("abnormal termination", "abnormal exit code").                                                                        |
| `gimp`/`gimpy`, `lame`                                                                                                                                               | `gimp` has an explicit carve-out for the GIMP image editor and similarly-named tools; neither has a fixed replacement token, and both are DETECT-ONLY at best.                                                                                      |
| `native` (of people); `target` (verb, of people)                                                                                                                     | Both are advisory ("avoid... when possible") and the words themselves are ubiquitous in unrelated, correct senses ("native app", "cloud-native", "target audience").                                                                                |
| `above`/`below`/`higher`/`lower`/`older` (version-range words)                                                                                                       | Explicitly OK when non-directional ("below average", describing a hierarchy) and reversed for Android docs; only safe when anchored to an unambiguous version-number context, which a blind pattern can't establish.                                |
| `tap`/`click` (touch vs. desktop)                                                                                                                                    | Requires knowing whether the document targets a touch device, which Recheck cannot infer from text alone.                                                                                                                                           |

### DETECT-ONLY entries not shipped

Real, confirmed guide content with no fixed replacement, excluded here
because a generic "avoid this" pattern for these specific terms was judged
lower-value than the DETECT-ONLY rules that did ship (`no-via`, `no-hover`,
`utilize`, `performant`, `chapter-terminology`, `blind-figurative`):

| Candidate                                                                                                                  | Why excluded                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `persist` (transitive verb)                                                                                                | "Don't use as a transitive verb... best to avoid using as a verb at all" — no fixed replacement token, needs a rewrite.                                                                                |
| `comply`/`compliant`                                                                                                       | Advisory caution only ("a claim that a product is compliant... is a strong statement"), no replacement at all — not a lint-shaped rule.                                                                |
| `CLI` (bare, generic)                                                                                                      | Needs "the specific CLI", which varies by context; no fixed swap target.                                                                                                                               |
| `gray-box`/`graybox` testing                                                                                               | "describe exactly what it's doing" — no fixed term, and `translucent-box testing` is only an example, not a mandate.                                                                                   |
| `tribal knowledge`/`wisdom`                                                                                                | "use a less figurative term" — no fixed replacement.                                                                                                                                                   |
| `anti-pattern`, `canary`/`canarying` (verb), `best effort`, `out of the box` (figurative), `reservation, off the`, `voila` | Each is "avoid"/"don't use" with no fixed replacement token; the underlying content is confirmed but not independently high-value enough to ship as a detection-only pattern rule in this pass.        |
| `physically challenged`, `special`, `differently abled`, `handi-capable`                                                   | DETECT-ONLY per `inclusive-documentation`, no replacement offered.                                                                                                                                     |
| `right-hand side` (directional language, generally)                                                                        | DETECT-ONLY, no fixed replacement — see also the TOO-RISKY note on `above`/`below` above; directional language generally was judged too broad to ship as its own rule (see "Author's judgment calls"). |

### NOISY (verifier-confirmed content, judged too broad to enforce)

**Accounting note, so the count below is checkable.** The task-9 corrections
brief referred to "the 32 NOISY candidates from the research"
(`research-google-style.md`'s own §4 tally). That figure is a count over a
_different_ population, using a _different_ taxonomy, than this file's own
four-row table below. The research draft numbered 146 candidate "rule
ideas" and gave each one its own provisional, pre-verification classification
(CLEAN/NOISY/NOT-ENFORCEABLE); 32 of those 146 rows carried NOISY as their
first-stated verdict. This preset was not built by re-litigating those 146
rows one-by-one — the five verification passes instead checked candidate
content directly against the live guide's word-list and topic pages
(~380 distinct entries, a finer unit than the 146 rows: e.g. one draft row
can bundle a dozen word-list headwords). Cross-referencing the specific
32 research-draft NOISY rows against what this file actually contains:

- **6 ended up shipped anyway**, because a narrower scope, `fix: false`,
  or a detection-only rule shape resolved the original noise concern
  instead of requiring exclusion: `heading-sentence-case` (row 1, `fix:
false` + the `exceptions` mechanism), `no-code-in-heading` (row 9,
  scoped to headings), `second-person` (row 13, detection-only),
  `use-contractions` (row 17, `fix: false`), the timeless-documentation
  words (row 29, 5 of ~15 shipped; see "Author's judgment calls" below for
  the rest), and `copy-and-paste` (row 91, the copy/paste half only — the
  same row's keyboard-shortcut suggestion was not shipped or excluded
  anywhere, see below).
- **5 correspond exactly to this table's own four rows** below (row 6 →
  `no-gerund-headings`; row 52 → `no-slashes-general`; row 95 → table
  sentence-case; rows 100 and 102 → the shared `no-quotes-around-code` /
  `no-angle-brackets-around-code` row).
- **2 correspond to NOT-ENFORCEABLE entries** below (row 39 → `oxford-comma`;
  row 123 → gendered pronouns used generically).
- **1 splits across two other tables**: row 145 ("console"/"CLI"/"UI"/
  "Cloud"/"mobile" used bare) has its "CLI" part in DETECT-ONLY above and
  its "Cloud" part in TOO-RISKY above; the "UI"/"mobile" parts of that same
  row aren't reflected anywhere.
- **The remaining 18 do not reappear anywhere in this file** — shipped,
  excluded, or otherwise: nonbreaking space before a unit (row 69),
  thousands-separator commas (row 61), avoiding seasons (row 65), SVG over
  PNG (row 113), not forcing line breaks (row 115), inline HTML (row 116),
  comma before "which"/"because" (rows 48-49), a colon instead of a dash to
  introduce a list item (row 44), ambiguous-conjunction swaps like
  since/while/once (row 131), modal-verb guidance (row 132), noun/verb form
  pairs like setup/set up (row 133), spell-checking prose generally (row
  142), foo/bar/baz placeholders (row 144), present tense / avoiding
  will/would (row 16), the screen-reader punctuation caution (row 22), and
  10x-style symbol substitutions (row 37). Their absence here means they
  were never carried into the five verifiers' own ~380-entry check —
  **not** that a verifier confirmed them and this preset silently dropped
  them. Anyone who wants a disposition for one of those 18 specific ideas
  should treat it as unverified against the live guide, not as any of this
  file's excluded categories, and it is not shipped.

The four rows below are this preset's own, narrower "NOISY" bucket: guide
content a verifier independently confirmed as real, but judged too broad to
enforce as a rule. That is a stricter, verifier-anchored sense of "NOISY"
than the research draft's own pre-verification tally, which is why the
counts don't and shouldn't match.

| Candidate                                                                         | Why excluded                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-gerund-headings` (heading starting with an -ing word, except Billing/Pricing) | Confirmed principle, but the enforcement shape (first word ends in "-ing") would misfire heavily on common tech-noun headings used as topics, not verb-form imperatives (Networking, Logging, Caching, Monitoring, Testing) — Google names only two exceptions, which is itself evidence the underlying judgment needs more context than a heading's first word. |
| `no-quotes-around-code`, `no-angle-brackets-around-code`                          | Confirmed, but the draft itself already flagged these as NOISY; not re-litigated.                                                                                                                                                                                                                                                                                |
| table sentence-case (`Use sentence case for all the elements in a table`)         | Confirmed, but table cells often legitimately contain short labels, proper nouns, or numeric/code values that don't fit sentence-case cleanly (verifier B row 95, marked NOISY).                                                                                                                                                                                 |
| `no-slashes-general` (`Avoid using slashes, except in code`)                      | Too broad — slashes appear constantly in dates, paths, fractions, and URLs; the draft itself marked this NOISY/dropped.                                                                                                                                                                                                                                          |

### NOT-ENFORCEABLE (real guide content, requires human judgment)

| Candidate                                                                                                                                                                                                                                     | Why excluded                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `optional-prefix` (use "Optional:" prefix in headings)                                                                                                                                                                                        | Requires knowing whether a section is genuinely optional — not something the linter can determine.                                                                                                                                                                                                                                                                                             |
| `complete-list-intro` (text before a colon must be a complete sentence)                                                                                                                                                                       | Requires grammatical-completeness judgment beyond regex/AST primitives.                                                                                                                                                                                                                                                                                                                        |
| `oxford-comma` (missing comma before the final "and"/"or" in a list)                                                                                                                                                                          | Confirmed content, but reliably detecting a MISSING Oxford comma without a high false-positive rate on ordinary two-clause sentences needs real list/clause parsing, not regex.                                                                                                                                                                                                                |
| `abbrev-as-verb` (don't use acronyms as verbs, e.g. "ping the server")                                                                                                                                                                        | Requires knowing a word's grammatical role (verb vs. noun), which the engine's primitives can't determine.                                                                                                                                                                                                                                                                                     |
| `abbrev-first-use` (spell out an abbreviation on first mention)                                                                                                                                                                               | Requires positional "is this the first mention" tracking across an arbitrary, unbounded set of abbreviations.                                                                                                                                                                                                                                                                                  |
| `no-duplicate-link-destinations` (avoid linking one destination from different texts)                                                                                                                                                         | The guide states explicit exceptions (linking to a different section, a long page, multiple entry points) that the engine's existing token rule — which fires on same-destination/different-anchor-text — can't evaluate against. (The rule remains available generically via `recheck/markdown` for projects that want it unconditionally; it just isn't part of this style-fidelity preset.) |
| external link icon (`Don't use an external link icon`)                                                                                                                                                                                        | About a rendered visual icon/CSS class, not markdown text — nothing to match.                                                                                                                                                                                                                                                                                                                  |
| `ui-element-ellipsis` (drop the "..." from a UI element name reference)                                                                                                                                                                       | Requires reliably identifying "this text is quoting a UI element name", which risks both over- and under-firing with a regex.                                                                                                                                                                                                                                                                  |
| `no-directional-language` (above/below/right-hand side as spatial UI references)                                                                                                                                                              | The guide's objection is to visual/spatial positioning language specifically; a text pattern can't distinguish that from the equally common non-directional uses of the same words (see the TOO-RISKY note above).                                                                                                                                                                             |
| `button-for-link` ("a link isn't the same as a button")                                                                                                                                                                                       | Requires knowing whether a referenced UI element is actually a button or a link, which text alone doesn't establish.                                                                                                                                                                                                                                                                           |
| gendered pronouns used generically (bare he/him/his/she/her)                                                                                                                                                                                  | Requires knowing whether a pronoun refers to a specific named person or is used generically — text alone can't distinguish.                                                                                                                                                                                                                                                                    |
| "introduce a table in the text preceding it"; the large "what belongs in code font" table; "don't pre-announce anything... unless approved by legal counsel"; "don't use metaphors"; passive voice ("make clear who's performing the action") | All require holistic judgment about content/structure/legal status that the engine's regex/AST primitives cannot evaluate.                                                                                                                                                                                                                                                                     |

### Dropped in Fix wave A (confirmed content, but not safely fixable/matchable)

An independent review (task 9, fix wave A, 2026-07-29) reproduced four
demonstrable prose-corruption defects and diagnosed a structural coverage
gap that let 85 of the preset's 86 swap pairs ship with zero fixture
coverage. These candidates were CONFIRMED guide content (they were already
shipping) but are dropped here rather than fixed, because no safe
detection/fix shape was achievable with the assertions available — see
`task-9-report.md`'s "Fix wave A" section for the full defect list, every
fix applied, and the re-run acceptance evidence.

| Candidate                                                             | Why excluded                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'in line': 'inline'` (space-separated form, `google/compound-forms`) | Google's own quote ("One word as an adjective, inline, not in line or in-line") only objects to the ADJECTIVAL use, but bare "in line" is at least as commonly the correct idiom "in line with" or the plain verb phrase "wait in line"/"stand in line", neither of which the guide says anything about. Reproduced: `"This change is in line with the platform roadmap."` was being rewritten to `"...is inline with..."`. There's no reliable regex-only way to tell the wrong adjectival use apart from the idiom, so the key is dropped rather than shipped fixable or even detection-only. `'in-line': 'inline'` (the hyphenated form) is KEPT — it doesn't collide with the "in line with"/"wait in line" idioms, which are never written hyphenated. |
| `'API Console': 'Google Cloud console'` (`google/product-names`)      | Verifier B row 125 flagged that it doesn't map cleanly — the guide's own text offers "Google APIs Explorer **or** the Google Cloud console" by context, and which one is meant depends on what the original "API Console" reference meant. Not in verifier C's confirmed-clean list either.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Microservices: 'microservices'` (`google/acronym-forms`)             | Fires on legitimate sentence-initial capitalization ("Microservices deployed on the platform can scale independently...") just as readily as on the actual violation (mid-sentence "the Microservices approach"), and `applyMatchCase` re-capitalizes the replacement to match the (all-caps-adjacent) matched casing, so the "fix" is a permanent no-op — an unsuppressible warning either way. There's no reliable way to detect "sentence-initial" from a `swap` pair alone. The lowercase/hyphenated form `'micro-services': 'microservices'` is KEPT (case-sensitive, so it never matches a legitimately-capitalized sentence start).                                                                                                                  |

## Deliberation and development history

Everything from here on records how the shipped and excluded lists above
were reached: sourcing/hashing methodology, the fabrications an earlier
draft introduced, the successive fix waves that corrected or excluded
specific pairs, and the axes a pair must clear before auto-fix is safe.
**A reader who only wants provenance can stop reading above this point** —
everything below is for someone auditing or extending this preset.

### `sources.json` normalization

`sources.json` records one hash per source page as drift detection for a
future re-check: re-fetch a page later, and a changed digest means the
guide's content changed. The version of this file that shipped before
this pass hashed the raw HTML response directly. That does not work as
drift detection: every `developers.google.com/style/*` page embeds a
per-request `<script type="application/json" analytics>` blob whose JSON
keys serialize in non-deterministic order, a CSP `nonce` attribute
regenerated on every request, and an inline feature-flag/experiment
bootstrap array whose element order also varies per request. None of that
reflects the guide's actual content, but it's enough entropy that two
consecutive fetches of the identical page produce different raw-HTML
digests every time — confirmed empirically: of the 30 pages listed in
`sources.json`, fetched twice each a few seconds apart, 16 had a different
raw byte length on the second fetch even though nothing about the guide's
content changed. Hashing raw HTML gives a 100% false-positive drift rate,
which is not drift detection at all — it's noise indistinguishable from
signal.

**Fix**: hash the extracted `<article class="devsite-article">...</article>`
region instead of the full page. That region is exactly the guide's
rendered content (headings, paragraphs, lists, tables, the `<dl>`
definition lists the word-list page is built from) and excludes all of
the non-deterministic chrome described above. Verified reproducible: two
consecutive fetches of all 30 pages in `sources.json` (not just a sample)
produced a byte-identical extracted region, and therefore an identical
sha256, for every single page — including the 16 whose raw HTML length
differed between fetches. Reproduction recipe: fetch the page's HTML with
**`curl`** (Fix wave C / Item 4: a plain Node `fetch()` was confirmed to
return a materially different HTML variant of the same URL — not just the
per-request noise above, but a different response shape from the same
client-vs-client comparison — so a future re-check that fetches with a
different HTTP client could see a mismatch and misread it as guide drift;
`sources.json`'s `normalization.fetchMethod` now records this too), take
the first `<article class="devsite-article">...</article>` match (a
non-greedy, dot-matches-newline regex scan; every page has exactly one),
and sha256 the UTF-8 bytes of that substring.

Each `sources.json` entry also records `bytes` — the byte length of the
extracted region, not the raw page — so a future re-check that produces a
matching `bytes` but a different `sha256` (or vice versa) is a signal to
check whether the _extraction_ shape changed (e.g. Google renamed the
wrapper class) before treating the result as real guide drift.

This normalization has a real, narrow blind spot: a change confined
entirely to the `<article>` wrapper's own attributes, or to guide content
that Google renders outside that element, would not be detected. No such
case was observed across any of the 30 pages while producing this file.

### Fix wave A corrections (2026-07-29)

Beyond the drops above, several shipped pairs were corrected in place —
same rule content, safer matching or `fix: false` — rather than dropped,
because the underlying guide entry is real and worth keeping. Full
before/after detail, reproduction commands, and gate output live in
`task-9-report.md`; this is the pointer from provenance to what changed
and why, so a rule split doesn't read as an unexplained addition.

- **`google/no-latinisms` split in two.** The period-terminated keys
  (`i.e.`, `e.g.`, `vs.`) keep `wordBoundary: false` (a trailing `\b`
  right after a period-then-space never matches — both are non-word
  characters) but now carry a LEADING `\b` baked into the regex source via
  `keysAreRegex`, so `vs.` can no longer match inside unrelated words like
  "revs.". `aka` and `vice versa` (no trailing period, so they never
  needed the exemption) moved to a new rule, `google/no-latinisms-plain`,
  with full `wordBoundary: true` anchoring — this is what stops `aka` from
  matching inside "Akamai"/"Osaka".
- **`google/no-slash-abbrev`** (`c/o`, `w/`) similarly gained a
  leading-only `\b` via `keysAreRegex`, so `w/` no longer matches inside
  "www/static", "show/hide", "new/old", and `c/o` no longer matches inside
  "src/output".
- **`google/acronym-forms`**: `'OAuth 2'` gained a `(?!\.0)` negative
  lookahead so it can no longer match inside the already-correct "OAuth
  2.0" (which was compounding into "OAuth 2.0.0.0.0.0.0" under
  `runRulesUntilStable`). `SHA1` moved to its own rule
  (`google/sha1-form`, `fix: false`) with a negative lookbehind excluding
  a hyphen-preceded match, matching the guide's own documented
  hyphenated-compound exception (e.g. "HMAC-SHA1"). `UNICODE` and `IPSEC`
  moved to `google/acronym-caps-detect-only` (`fix: false`): both are
  ALL-CAPS matches whose correct replacement (`Unicode`/`IPsec`), when
  `applyMatchCase` re-upper-cases it to match the all-caps input, round-trips
  back to the ORIGINAL wrong spelling byte-for-byte — a permanent,
  silent no-op fix that `--fix` nonetheless reported as "fixed".
- **`google/product-names`**: `'Cloud console'` gained a `(?<!Google )`
  negative lookbehind — it's a literal substring of its own replacement
  ("Google Cloud console"), so it was compounding a "Google " prefix every
  pass, the same failure shape as the OAuth 2 bug above (and it fed the
  same bug via `'Developers Console'`'s own correct output). `GCP` moved
  to its own rule (`google/gcp-name`, `fix: false`): `applyMatchCase`
  upper-cases an all-caps match's ENTIRE multi-word replacement, so
  "GCP" -> "Google Cloud" was being written as "GOOGLE CLOUD".
- **`google/colo-form`**: split out of `google/compound-forms`, `fix:
false`. `colo` is a noun ("a colocation facility"); `colocate` is a
  verb — the unconditional swap produced "The colocate hosts the racks."
- **`google/no-please-note`**: `fix: false` added. Deleting the phrase
  leaves a capitalization/fragment mess behind ("Please note that the
  endpoint is deprecated." -> "that the endpoint is deprecated.").
- **`google/second-person`**: `ignoreCase: true` replaced with an explicit
  `(?:We|we|Our|our|Us|us)` alternation, so it no longer matches the
  all-caps abbreviation "US" that `google/us-abbreviation` fixes toward —
  previously the two rules fought each other on every occurrence of "US".

All of the above were found and fixed by the per-PAIR coverage gate added
in the same pass (`src/config/__tests__/preset-google.test.ts`'s "per-pair
coverage" test) plus targeted idempotency/self-match static analysis — see
`task-9-report.md` for the methodology and the complete list.

### Fix wave C corrections (2026-07-29)

An independent re-review found this same `applyMatchCase` bug — an
ALL-CAPS match forcing a multi-word replacement to shout — recurring a
THIRD time (`AKA` -> `ALSO KNOWN AS`, `VICE VERSA` -> `THE OTHER WAY
AROUND`, `C/O` -> `CARE OF`, all in rules that shipped with no `fix: false`
workaround at all), after `GCP` and `UNICODE`/`IPSEC` above had each been
patched around it per-rule. This wave fixed it at the source instead
(`src/core/case-preserve.ts`'s `applyMatchCase`): an ALL-CAPS match no
longer forces a MULTI-WORD replacement to upper-case; single-word
replacements are unchanged (`WHITELIST` -> `ALLOWLIST` still shouts — that
remains correct). Two statements above are now stale as a result:

- **`GCP` is fixable again.** `google/gcp-name`'s `fix: false` (added
  above specifically because `applyMatchCase` was shouting "GOOGLE CLOUD")
  is REMOVED — the engine fix produces the correctly-cased `"Google
Cloud"` now, and the result is idempotent. `UNICODE`/`IPSEC`
  (`google/acronym-caps-detect-only`) were re-checked against the same
  engine fix and correctly stay `fix: false`: their replacements
  (`Unicode`, `IPsec`) are each a single word, so the multi-word condition
  never applies and the round-trip no-op is unchanged — a genuinely
  different defect shape (same-word casing round-trip, not a
  multi-word-phrase shout), not something this engine fix was meant to
  reach.
- **`google/product-names`'s `'Cloud console'` lookbehind widened.** The
  `(?<!Google )` guard above only blocked the exact casing `Google `
  (single space); `(?<![Gg][Oo][Oo][Gg][Ll][Ee]\s+)` now blocks any casing
  of "google" followed by any run of whitespace, closing the same
  self-compounding duplication (`"google Cloud console"` ->
  `"google Google Cloud console"`) the original fix was meant to
  eliminate but didn't fully.
- **`google/no-slash-abbrev` gained a trailing guard.** The leading-only
  `\b` above fixed matches inside a preceding word (`"src/output"`,
  `"www/static"`) but left the TRAILING side open: `w/` still matched
  inside the common, ordinary abbreviation `w/o` ("without"), and `c/o`
  inside a word immediately following it (`"c/oscillator"`). Both keys now
  carry a trailing `(?![A-Za-z])` negative lookahead blocking a following
  ASCII letter, so `w/o` and `c/oscillator` are left alone entirely (the
  guide's own `slashes` page doesn't list "w/o" as a separate entry),
  while `"w/ headers"` and `"c/o the compliance department"` still match.

See `task-9-report.md`'s "Fix wave C" section for the full list of every
rule whose `--fix` output changed as a result of the engine change (9
rules / 38 pairs across this preset alone — larger than the three rules
named above, since the fix is in the shared helper every `swap` rule
uses), the semantics chosen and why, and the complete acceptance evidence.

### CONFIRMED vs. safe-to-fix — a distinction future audits of this preset must also apply

Recorded here in mirror of `presets/microsoft/PROVENANCE.md`'s "Fix wave C /
Step 5" (task 10), per that task's brief: a verifier `CONFIRMED` verdict
establishes only that the live guide page discusses a term. It does **not**
establish that a blind textual (`swap`) substitution of that term is safe
to auto-apply — that is a separate question, and every verification pass
in task 10 conflated the two. `recheck/microsoft`'s task-10 fix wave C
found two pairs (`as well as` -> `and`, `or greater`/`or higher`/`or lower`
-> `or later`/`or earlier`) that were marked plain `CONFIRMED`, with the
correct quote attached, and still shipped as corrupting unconditional
swaps: the quotes themselves showed a caution against treating two terms as
interchangeable ("don't use X as a synonym for Y") or a context scoped
narrower than what shipped ("when identifying multiple versions..."), not
an unconditional "use Y instead of X" instruction.

This note is a forward-looking record, not a claim that this file's own
pairs were re-audited against that standard — that re-audit is out of
scope for task 10 (which targets `recheck/microsoft`) and has not been
done here. Whoever next adds a candidate pair to this preset, or authors
either of the two future presets task 10 anticipates, should apply the
same per-pair check `recheck/microsoft`'s Step 1 table used before marking
a `CONFIRMED` pair fixable: is the live quote a direct "Use Y, not X"
instruction, or does it instead read as a synonym-conflation caution, a
verb/context-scoped rule, a multi-target rule, or a "don't use X" with no
replacement stated? Only the first shape is safe to ship as an
unconditional `swap`; the rest need a position anchor, a narrower scope, or
detection-only, in that preference order. A `CONFIRMED` verdict is
necessary evidence that a rule belongs in the preset at all — it is not
sufficient evidence that the rule may safely auto-fix.

**This note's own re-audit did eventually happen** — see "Fix-posture
change" below, which re-audits every fixable pair in THIS preset against a
second, orthogonal axis the note above doesn't cover, and replaces the
"CONFIRMED vs. safe-to-fix" framing with a stricter, mechanical posture.

### Fix-posture change (2026-07-30)

> **RETIRED 2026-07-30 — see "Detection-only" below.** This section's
> criterion (same-word normalization) no longer determines which pairs are
> fixable in this preset: none are. Kept as historical record only.

Base commit `eb4f8b11dac`, branch `aa/recheck-style-guides`. Brief:
`.superpowers/sdd/preset-fix-posture-brief.md`. Report:
`.superpowers/sdd/preset-fix-posture-report.md`. Applied to both flagship
presets in the same pass — see `presets/microsoft/PROVENANCE.md`'s own
"Fix-posture change" section for the full two-axis rationale and the six
named corruption strings that motivated it (three fix waves on
`recheck/microsoft`, each fixing the pairs a probe found, each followed by
another probe finding more — 2, then 2, then 6). This preset shipped nine
of the same defect class across its own three fix waves (`GCP` shouting,
`OAuth 2` self-compounding, `w/o`/`c/oscillator` corruption, ...) — the
CONFIRMED-vs-safe-to-fix note above addresses the GUIDANCE-SHAPE axis
(direct instruction vs. caution/scoped/multi-target); it does not address
a second, orthogonal axis: whether the avoid-term ALSO has a legitimate,
unrelated sense a blind substitution corrupts regardless of how clearly
the guide states its rule.

#### The posture

Auto-fix is retained only where a replacement cannot be wrong: the same
word, normalized (spelling, hyphenation, casing, or a non-standard written
form of the identical word). A pair that substitutes a genuinely different
word or phrase — even a synonym that looks safe on the page — moves to
detection-only. Concrete examples found THIS wave, previously shipped
fixable under a plain `CONFIRMED`/reasonable-looking verdict:

- **`agnostic` → `platform-independent`** (`google/plain-language-swaps`):
  "agnostic" very commonly means doubting or noncommittal about religious
  or philosophical claims ("he's agnostic about the existence of an
  afterlife") — a blind fix corrupts that sentence into "...platform-
  independent about the existence of an afterlife." The word-list entry
  is real and the replacement is reasonable for the INTENDED sense; it is
  simply also a different word with an unrelated common sense, the same
  shape as `recheck/microsoft`'s `DMZ`.
- **`GCP` → `Google Cloud`** (`google/gcp-name`): the same shape as `DMZ` →
  `perimeter network` — an acronym expanded into a DIFFERENT phrase than
  its own literal expansion (`GCP` stands for "Google Cloud Platform", not
  "Google Cloud"), not a respelling, and `GCP` has unrelated expansions in
  other domains ("Good Clinical Practice", "Grade Control Point"). Note
  this reverses Fix wave C's own "GCP is fixable again" call above: that
  wave correctly fixed a real ENGINE bug (the case-preservation shout),
  but engine-correctness and word-choice-safety are different questions,
  and only the first was checked at the time.
- **`IO` → `I/O`** (`google/acronym-forms`, moved to
  `google/acronym-caps-detect-only`): bare, case-sensitive "IO" is a real
  product/library name in common developer use ("Socket.IO" — the period
  before "IO" is a non-word character, so `\bIO\b` matches inside it) —
  "Socket.IO connects clients" would corrupt to "Socket.I/O connects
  clients."

By contrast, `google/compound-forms`'s ~80 remaining pairs (`data store` →
`datastore`, `e-mail` → `email`, ...) are genuine spacing/hyphenation
normalizations of the identical two words and stay fixable — this is the
family the fix-posture brief itself predicted would "largely survive."
Four pairs did NOT survive despite living in that same rule: `data
cleansing` → `data cleaning` (different word, "cleansing" vs "cleaning"),
`transcompile` → `transpile` (two competing compiler-jargon terms, not a
spelling variant), `autoupdate` → `automatically update` (expands "auto"
into a different word), and `pre-emptive` → `preemptible` (a different
adjective — "pre-emptive" describes acting in advance; "preemptible"
describes being subject to preemption — not a hyphenation of one word).
Moved to a new sibling rule, `google/compound-forms-word-choice`
(`fix: false`), since `fix` is a whole-rule flag and this bundle mixed
both classes.

#### Result

**Fixable `swap`/`consistency` pairs: 164 → 114**, across 41 rules with a
`swap`/`consistency` assertion (up from 38 — `google/vs-versus`,
`google/aka-form`, and `google/compound-forms-word-choice` are new,
splitting bundles that mixed same-word and different-word pairs).
`vs.` → `versus` and `aka` → `also known as` both stay fixable: unlike
`i.e.`/`e.g.` (Latin abbreviations translated into an unrelated English
phrase) and `vice versa` (a distinct Latin phrase with no letter-derived
relationship to its replacement), `vs.` and `aka` are literal truncations
of the identical word/phrase they abbreviate (`aka` is literally the
initials of "Also Known As"). **Correction (wave 2, see below): this call
on `aka` was wrong.** Expanding an abbreviation INTO a phrase is a
substitution, the same shape as `e.g.`/`i.e.` two sentences above, not a
respelling — "the letters spell out the words" does not make it a
same-word normalization. `aka` moved to `fix: false` in wave 2. `cURL` →
`curl` (a pure casing correction)
moved from `google/product-names` (now fully detection-only) to
`google/brand-capitalization`, which already ships the same class of
case-only brand-name fix.

Severity is unaffected: this preset's existing policy already puts every
word-choice/phrasing rule at `warn` regardless of fixability (see "Shipped
rules" above), so newly-detection-only rules needed no severity change.

#### Gates

`pnpm build`, `pnpm test` (105 files, 1467 passed / 5 skipped — shared
suite with `recheck/microsoft`), `pnpm parity --corpus monorepo-docs`
(unchanged: 27425 = 27425, 0 unexplained — this preset has no bearing on
the markdownlint-parity corpus), `npx nx run recheck:lint
--max-warnings=0` (clean). Every one of the 114 pairs that remain fixable
in this preset (240 combined with `recheck/microsoft`'s 126) was verified
programmatically: real change, idempotent (second `--fix` pass is a
no-op), and the original violation regex no longer matches the fixed
text — not sampled. Full command output and the exhaustive fixable-rule
table are in `.superpowers/sdd/preset-fix-posture-report.md`.

### Fix-posture change, wave 2 — the proper-noun axis (2026-07-30)

> **RETIRED 2026-07-30 — see "Detection-only" below.** This section's
> third axis (proper-noun collision) no longer determines which pairs are
> fixable in this preset: none are. Kept as historical record only.

Base commit `25a62c3d1f1`, branch `aa/recheck-style-guides`. Brief:
`.superpowers/sdd/preset-posture-fix2-brief.md`. Report:
`.superpowers/sdd/preset-fix-posture-report.md`'s "Wave 2" section. See
`presets/microsoft/PROVENANCE.md`'s own "Fix-posture change, wave 2"
section for the full rationale shared by both presets; this section
covers this preset's specific findings.

#### The third axis

A pair keeps `fix: true` only if it is the same word normalized (axis 1,
guidance-shape), has no unrelated legitimate sense (axis 2, homograph —
wave 1), **and, new this wave, cannot occur as part of a real
organization, product, brand, or place name.** Four demonstrated
corruptions share this cause: `markdown` → `Markdown` (a retail markdown
sentence gets capitalized into the markup-language name), `FinTech` →
`fintech` (breaks "FinTech Group AG", a real company), `U.S.` → `US`
(breaks "U.S. Bank", a real bank), `USA` → `US` (breaks "USA Gymnastics",
a real governing body — this specific pair lives in
`microsoft/usa-abbreviation`, not this preset, since `google/us-
abbreviation` never shipped a bare `USA` key). Acronyms and single
capitalizable words are the highest-risk shapes: a rule that ignores
case or normalizes punctuation matches a proper noun's own official
spelling exactly as readily as ordinary prose.

#### Sweep and results

Every fixable `swap` pair in this preset (105 pairs after this wave,
sweeping the full ~114-pair fixable set left by wave 1) was checked
against question 3.

| Rule                          | Pair(s) flipped                       | Real proper noun / other reason                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `google/aka-form`             | `aka` → `also known as`               | Not proper-noun — **misclassified in wave 1** (see the correction note above): expanding an abbreviation into a phrase is a substitution, the same shape as `e.g.`/`i.e.`, not a same-word normalization. Also happens to double as a real proper noun ("AKA" is the common abbreviation for the sorority Alpha Kappa Alpha — "She was initiated into AKA her freshman year" is a genuine, independent proper-noun collision on top of the misclassification). |
| `google/us-abbreviation`      | `U.S.A.`/`U.S.` → `US` (both)         | "U.S. Bank" (top-10 US bank), "U.S. Steel", "U.S.A. Track and Field" (national governing body) — the named brief case.                                                                                                                                                                                                                                                                                                                                         |
| `google/acronym-forms`        | `FinTech` → `fintech`                 | "FinTech Group AG" — a real, publicly-traded German company whose name keeps the mixed-case "FinTech" spelling.                                                                                                                                                                                                                                                                                                                                                |
| `google/acronym-forms`        | `I-O` → `I/O`                         | "I-O DATA DEVICE, INC." — a real, major Japanese PC-peripherals manufacturer ("Japan's undisputed market leader" in that industry) whose brand is written exactly "I-O" (hyphenated, capital letters). `fin-tech`/`adtech`/`ad-tech` (all-lowercase keys, no case change involved) do NOT carry this risk: this rule is case-sensitive, so an all-lowercase key can never match a capitalized brand's own casing in the first place.                           |
| `google/brand-capitalization` | `markdown` → `Markdown`               | The named brief case — both a retail/finance homograph (axis 2) AND, in the reverse direction, a proper-noun risk: capitalizing every lowercase occurrence assumes it always means the Markdown language.                                                                                                                                                                                                                                                      |
| `google/brand-capitalization` | `material design` → `Material Design` | Same reverse-direction risk as `markdown`: "the material design of the building incorporates local stone" is a plain, unrelated architectural phrase this pair would wrongly capitalize into Google's design-language name.                                                                                                                                                                                                                                    |
| `google/brand-capitalization` | `search console` → `Search Console`   | Same shape, weaker but still real: a generic lowercase phrase for an admin/tuning panel, not exclusively Google's product name.                                                                                                                                                                                                                                                                                                                                |
| `google/compound-forms`       | `datasource` → `data source`          | Collides with `javax.sql.DataSource`/Spring's `DataSource` — a real, load-bearing Java/Spring class and config-property name ("Configure the DataSource bean in the Spring context"), exactly the kind of technical content this preset's own audience writes about.                                                                                                                                                                                           |

**9 pairs flipped**, each moved to a new detection-only sibling rather
than anchored (`google/acronym-forms-proper-noun`, `google/brand-
capitalization-proper-noun`, `google/compound-forms-proper-noun`;
`google/aka-form` and `google/us-abbreviation` flip whole-rule since every
pair in each was reclassified). Severity is unaffected — this preset's
existing policy already puts every word-choice/phrasing rule at `warn`
regardless of fixability, so nothing needed adjusting, matching wave 1's
own note.

**Fixable pairs: 114 → 105.**

#### Why `fix: false`, not another anchor

Same reasoning as `recheck/microsoft`'s wave 2 section: three separate
waves have each shown an anchor leaking exactly one near-miss beyond
wherever it was tested. A casing/abbreviation fix is low-value enough
that detection alone is a fine outcome, so every pair this wave found
moved straight to `fix: false` rather than growing another exclusion
list.

#### Gates

`pnpm build`, `pnpm test` (105 files, 1490 passed / 5 skipped — 23 new
tests this wave, shared suite with `recheck/microsoft`), `pnpm parity
--corpus monorepo-docs --profile default` (unchanged: 27425 = 27425, 0
unexplained), `npx nx run recheck:lint --max-warnings=0` (clean). Every
sentence in the brief's acceptance set 1 verified unchanged through
`--fix` twice and still detected against the correct new rule name; every
rule (including the 3 new ones here) still fires on
`google-violations.md`. Full output in
`.superpowers/sdd/preset-fix-posture-report.md`'s "Wave 2" section.

### Detection-only (2026-07-30)

Base commit `006c026a1f0`, branch `aa/recheck-style-guides`. Brief:
`.superpowers/sdd/preset-detection-only-brief.md`. Report:
`.superpowers/sdd/preset-detection-only-report.md`.

**This section REPLACES the fixability criterion described in "CONFIRMED
vs. safe-to-fix," "Fix-posture change," and "Fix-posture change, wave 2"
above — it does not sit alongside them as a fourth, stricter axis.** Those
three sections are kept below, unedited, as the historical record of the
criteria that were tried and superseded; do not read any of them as current
guidance. As of this section, **`recheck/google` ships zero fixable rules.
Every rule in this file is `fix: false`, unconditionally** — set
structurally, once, by a loop at the end of `buildGooglePreset()`
(`src/config/presets/google.ts`), not by auditing pairs against a sharper
rule. A dedicated test (`preset-google.test.ts`'s "is detection-only"
describe block) reads the live preset object and fails if any rule is ever
fixable again — the same derive-from-the-preset shape the per-pair coverage
gate already uses, so this cannot regress silently the way three prior
narrowing passes did.

#### Why a fourth axis wasn't the answer

Two prior fix-posture changes (above) each replaced "does the guide confirm
this pair" with a sharper structural test — first "is it the same word
normalized" (axis 1: guidance-shape, then axis 2: homograph), then "does it
also collide with a real proper noun" (axis 3). Each pass shipped clean
against its own criterion and each was then probed again. The fifth
adversarial probe against this preset and `recheck/microsoft` together (the
project's fifth in total, after three rounds already narrowed what counted
as "safe") found **18 of 29 probed pairs (62%) still corrupting correct
prose** — a RISING hit rate, not a falling one, and the failures spanned
every category previously believed safe by axes 1-3, including two this
preset's own criteria treated as clean:

- **Spelling**, believed the safest category of all: Hemingway's real,
  correctly spelled published title _A Moveable Feast_ is corrected to "A
  Movable Feast" by `microsoft/az-grammar-usage`'s `moveable` → `movable`
  pair (a genuine same-word normalization by every axis above — axis 1
  passes, axis 2 finds no unrelated sense, axis 3 finds no proper-noun
  collision on the WORD "moveable" itself, and the collision is instead
  with a specific, individually unforeseeable literary title).
- **Hyphenation**, this preset's own `read only` → `read-only` pair
  (`google/compound-forms`): "Please read only the introduction" — an
  adverb ("only") modifying a verb ("read") plus its object — becomes
  "Please read-only the introduction," a nonsense adjective use. Same-word
  by every axis (it is the identical two words, just joined), yet wrong,
  because the axes check the WORDS, not the GRAMMATICAL ROLE those words
  are playing in the sentence being fixed.
- **Meaning inverted outright**: `google/acronym-forms`'s `No SQL` → `NoSQL`
  turns "No SQL is used here" (a true statement that no NoSQL database is
  in use) into "NoSQL is used here" (a false statement that one is) — same
  word-pair, same axis-1/2/3 clearance, opposite meaning.

Full round-5 acceptance evidence (every sentence above, and more, run
through `--fix` twice and confirmed byte-identical) lives in
`src/config/__tests__/preset-detection-only-acceptance.test.ts`, plus the
per-preset regression suites in `preset-google-fix-wave-c.test.ts` and
`preset-microsoft.test.ts` (both rewritten by this change to assert
"unchanged" where they used to assert a real rewrite).

#### The conclusion this decision rests on

A rule's _category_ — spelling, hyphenation, casing, word-choice — does not
predict fix-safety at this scale. A style guide states _intent_ ("use X to
mean Y"); a `swap`/`consistency`/`pattern` rule matches _tokens_ (literal
text, regardless of the grammatical role or referent that text has in a
given sentence). That gap is not closable by inventing a fourth, fifth, or
sixth axis: axis 1 (guidance-shape) closed the space of pairs where the
guide's own wording was ambiguous; axis 2 (homograph) closed the space of
words with an unrelated common sense; axis 3 (proper-noun) closed the space
of words that double as real names. Each closure found the NEXT gap, not
zero gap. The project decision is to stop narrowing and remove fixing
capability from both style-guide presets entirely: users get every finding
(detection is completely unaffected — every rule still runs `execute()` and
reports) and apply the judgment a style guide has always required, same as
before either preset existed and same as Vale (the tool these presets
replace), which never shipped an auto-fixer and never had this class of
bug.

#### What did not change

Detection. Every rule's `execute()` path, message, severity, and scope are
untouched — only `fix()` is gated off (`core/runner.ts`'s
`rule.fix !== false` check). The per-pair and per-rule coverage gates
(`preset-google.test.ts`) still require every rule to fire on its own clean
fixture, so a rule that neither fixes nor reports is still caught as dead
weight, same as before this change.

### Known limitations

Two verifier-confirmed guide-sanctioned exceptions that the shipped rules
do not implement. Both are documented here explicitly, not just in the
Shipped rules table's own one-line notes, because a rule that is stricter
than its source needs to say so where a reader is actually looking for
"why did this fire on text the guide allows" — otherwise a user hitting
either case reasonably concludes the preset misquotes Google.

1. **`google/no-emphasis-as-heading` over-fires on one shape of the
   guide's own "run-in heading" pattern (verifier A row 12).** The guide
   permits bold for "run-in headings" — a bolded lead-in term followed by
   its description, most commonly inside a description-list item (`Google's
own example: <li><b>Emu</b>: the best kind of bird</li>`) or a single
   paragraph ("**Emu:** the best kind of bird."), and instructs authors to
   "end the run-in heading with a period or a colon." The shipped rule
   (ported from markdownlint's MD036) already tolerates the common cases:
   it only examines top-level paragraphs (so a run-in heading inside an
   actual list item is never even considered), a bold lead-in with more
   text in the SAME paragraph is excluded (the paragraph has more than one
   meaningful child), and a bold-only paragraph ending in the guide's own
   required punctuation is excluded by the rule's pre-existing punctuation
   check. Empirically verified still-flagged: a bold/italic-only paragraph
   with NO ending punctuation, whose description follows in a SEPARATE,
   later paragraph (e.g. `**Emu**\n\nThe best kind of bird.`) — reproduced
   directly against the shipped rule. Not fixed in this pass: the rule is
   a markdownlint port shared with `recheck/markdown` (out of scope for
   this wave's provenance/documentation focus, and doing so risks the same
   loosening-vs-noise tradeoff every other TOO-RISKY exclusion in this file
   weighs).
2. **`google/no-url-as-link-text` does not exempt legal/ToS documents
   (verifier B row 71).** The guide's own text: "Exception: In some legal
   documents (such as some Terms of Service documents), it's okay to use
   URLs as link text." The shipped rule is a plain pattern match on link
   text starting with `http(s)://`, scoped to `link`; it has no way to
   know whether the document containing the link is a legal/ToS document,
   so it will flag a bare URL used as link text there too, against the
   guide's own stated exception. Not enforceable to fix with the engine's
   current primitives (same class of gap as `firewalls` → `firewall
rules`'s "Compute Engine documentation only" scoping and the
   NOT-ENFORCEABLE table's document-subject-matter entries above) — Recheck
   has no signal for what kind of document a file is.
3. **`google/gcp-name` is case-sensitive.** The pair (`GCP: 'Google
Cloud'`) carries no `ignoreCase`, so only the literal all-caps `GCP`
   token is matched or fixed — `gcp` and `Gcp` are neither flagged nor
   fixed by this rule. A reader could reasonably infer broader coverage
   than exists: many OTHER rules in this same file (e.g. `google/
compound-forms`, `google/use-contractions`) do set `ignoreCase: true`,
   so the absence here is easy to read as an oversight rather than a
   choice. It is a choice, shared with the sibling `google/product-names`
   (also no `ignoreCase`) and `google/brand-capitalization` (explicitly
   documented as "deliberately case-sensitive keys, matching only the
   wrongly-cased literal form" in its own comment) — all three treat
   brand/product-name casing as exact-match by design. Left as-is rather
   than widened here (carried over from a `recheck/microsoft` fix-wave
   audit, flagged as a documentation gap, not a behavior bug): widening to
   `ignoreCase: true` is a scope decision for whoever owns `google.ts`, not
   a documentation fix.

### Author's judgment calls

Decisions this preset's author made that go beyond a verifier's literal
verdict, recorded per the task's instruction to flag (not silently
resolve) anything not settled by the inputs:

1. **`google/first-line-h1` and `google/single-h1` share one Google
   quote.** Verifier A's row 4 confirms both rule ids against the same
   sentence ("only use a level-1 heading once on a page"); the research
   draft, not a separate guide statement, is what split them into two rule
   ids. Both ship (both are real markdownlint-ported mechanisms Google's
   principle supports), but see point 2.
2. **`single-h1` and `first-line-h1` cannot both fire from one document.**
   Empirically verified (not assumed): the underlying token rules faithfully
   port markdownlint's MD025/MD041, which check OPPOSITE preconditions of
   "the document's first heading" — `single-h1` only reports a second h1
   when nothing but comments/frontmatter precede the first one;
   `first-line-h1` only fires when that first real content is NOT a correct
   h1. `google-violations.md` (which starts with a level-2 heading to
   trigger `first-line-h1`) structurally cannot also trigger `single-h1`, so
   a second, tiny fixture (`google-violations-single-h1.md`) isolates it.
   This is a genuine engine/upstream-semantics interaction, not a fixture
   bug or a noisy rule.
3. **Downgraded `list-length` from the generic "list mechanics = error"
   class to `warn`.** The verifier marked the underlying quote
   NOT-ENFORCEABLE (descriptive, not imperative); only the mechanism
   (`list-length`'s `min: 2` default) is deterministic, so the softer
   severity reflects the guide's own softer confidence.
4. **Shipped only 5 of ~15 confirmed "timeless documentation" words.** All
   ~15 are confirmed content, but 10 of them (`existing`, `future`,
   `latest`, `new`, `newer`, `now`, `old`, `older`, `soon`, `eventually`,
   `in the future`) are ordinary high-frequency English words with
   extensive legitimate everyday use unrelated to documentation staleness.
   Shipping them would make the preset unusably noisy on typical prose —
   the same class of risk the verifiers flagged elsewhere as TOO-RISKY,
   extended here on the same reasoning to entries the verifiers didn't
   individually re-litigate for riskiness (their job was confirming
   content, not judging blind-match safety for every term).
5. **`google/no-numbered-headings` ships despite some residual risk.**
   Narrowly scoped to `Step N`/`Part N` markers and a bare leading ordinal,
   to keep the false-positive rate low; broader numeric heading patterns
   (e.g. version numbers in a heading) are not matched.
6. **`google/cons-and-pros` ships only the compound phrase.** Bare `pros`/
   `cons` are excluded even though individually confirmed, because standing
   alone they're closer to ambiguous (conference abbreviations, "con
   artist") than the extremely common, unambiguous two-word phrase.
7. **The Oxford-comma/no-and-or "except in tables" exception is not
   separately scoped.** `google/no-and-or` runs over the `summary` scope,
   which includes table cells, so it would also (correctly, per the general
   rule, but against the guide's own table exception) flag "and/or" inside
   a table. Judged not worth a bespoke scope array for one rule; a project
   that hits this can override the rule's `scope`.

### Engine/registry changes this preset required

- **Schema**: `src/config/schema.ts`'s top-level `patternProperties` only
  accepted `^recheck/[a-z0-9-_]+$` rule keys. Spec §2 ("Composition
  safety") requires per-preset namespacing (`google/<rule>`,
  `microsoft/<rule>`, ...) precisely so two flagship presets can be
  composed without collisions — the pattern is widened to
  `^[a-z][a-z0-9-]*/[a-z0-9-_]+$` to allow that (existing `recheck/*` keys
  are unaffected; they're just the `recheck` namespace now).
- **`length` moved from opt-in to preset-shipped.** `google/sentence-length`
  is the first non-prose preset rule to ship a native scope-rule
  assertion beyond what `recheck/prose` already ships. Per
  cross-task-constraints.md §C / task-9-10-resolutions.md §5, this trips
  the registry<->preset completeness guard in
  `src/config/__tests__/presets.test.ts`: `length` is removed from the
  documented-opt-in list (now `DOCUMENTED_OPT_IN_ASSERTIONS`, moved from
  `prose.ts` to `presets/index.ts` since the policy is monorepo-wide, not
  prose-specific) and the completeness test's "shipped" side is derived
  dynamically from ALL presets rather than a single prose-named constant.
  See that test file's own comments for the mechanics.
- **`.npmignore` widened to include `presets/**/_`.** The package has no
`files`field in`package.json`; publishing is governed entirely by
`.npmignore`, which was a blanket `_`deny with only`dist/\*_/_`and`package.json`allowed back in. A new top-level`presets/<name>/`directory (this file,`sources.json`) would have shipped nowhere without
this change — verified with `npm pack --dry-run` before and after.
