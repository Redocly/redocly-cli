# Provenance: `recheck/microsoft`

Source: [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/)
(canonical URL: `https://learn.microsoft.com/en-us/style-guide/welcome/`).
Upstream status: **archived** as of 2024-11-13 — Microsoft stopped actively
maintaining the guide on that date, but the content remains published (and
still receives occasional copyedits: page "Last updated on" dates in the
verification passes ranged from 2018 to 2026-07-06). License: CC BY 4.0 (see
below — the grant is not stated on any `learn.microsoft.com` page itself).
Sync date: **2026-07-29**.

Modification note: rules are adapted to Recheck's assertion vocabulary
(`swap`, `pattern`, `capitalization`, `length`, `occurrence`, plus a handful
of markdownlint-parity token rules); wording is paraphrased into each rule's
`message`, not quoted verbatim from the guide. Every rule carries a `link:`
to its source page.

## Licence — cite GitHub, not Microsoft Learn

**No `learn.microsoft.com` style-guide page states a licence anywhere.**
Verifier E grepped every fetched raw HTML page for "creative commons",
"cc-by", "cc by 4", and "licensed under" — zero hits on every page. The only
copyright-adjacent text on the site is a sitewide footer: "© 2024 Microsoft.
All rights reserved."

The grant instead lives one hop away, in the backing GitHub repository every
style-guide page's `content_git_url` page metadata points at:
`https://github.com/MicrosoftDocs/microsoft-style-guide/blob/main/LICENSE`.
Confirmed two independent ways:

- GitHub's own license-detection API:
  `"license": {"key": "cc-by-4.0", "name": "Creative Commons Attribution 4.0 International", "spdx_id": "CC-BY-4.0"}`.
- The raw `LICENSE` file itself is the full CC BY 4.0 legal code.

The site's Terms of Use (`https://learn.microsoft.com/en-us/legal/termsofuse`)
explicitly defers to this: _"Certain documentation may be subject to
explicit license terms separate from the terms contained here. To the
extent the terms conflict, the explicit license terms control."_

**Bottom line, and the reason this matters for the preset:** CC-BY-4.0
attribution is factually correct to ship, but every `link:` in `microsoft.ts`
points at the `learn.microsoft.com` page the rule's TEXT comes from — never
at a page claiming to state the licence, because none does. The repo's
`LICENSE` file is the citation for the licence claim itself, separate from
any individual rule's source link. There is also a separate `LICENSE-CODE`
file (MIT, for embedded code samples) — not relevant to prose rules.

This is a materially different situation from `recheck/google`, whose
`developers.google.com/style` pages carry an on-page CC BY 4.0 footer notice
directly. The two presets' licence-attribution code paths must not be
copy-pasted from one to the other.

## How this table was produced

Four independent verification passes fetched the LIVE guide directly (`curl`
with a real browser User-Agent, `html5lib`/BeautifulSoup — never a
summarizing fetch tool) and confirmed or rejected each candidate rule
against the raw page text/HTML:

```
task-10-verify-E.md   §2 (voice/word-choice/grammar, V1-V42) + §6 (self-contradictions) + LICENCE
task-10-verify-F.md   §3 (capitalization/headings/lists/tables/punctuation/UI/structure, C/L/T/P/N/U/A/W/S) + numeric claims + 17 omitted exceptions
task-10-verify-G.md   §5a A-Z word list, avoid-terms A-L (~100 entries), 7 contradictions
task-10-verify-H.md   §5a A-Z word list, avoid-terms M-Z + Tiers 2/3/4 (~165 entries), tier-boundary audit
```

Together they checked ~490 rules/entries across ~340 live page fetches and
found: 7 self-contradictions, 1 fabrication ("afflicted with"), 3 crossed
accessibility-table pairings, 1 inverted verdict ("shaded"), 1 wrong
direction/target ("boot" → "open"), 1 non-guidance rule ("corrupted" →
"damaged"), and 5 confirmed Tier-1/Tier-4 audience-conditional conflicts
(plus more found on closer reading during authoring — see "Additional
tier-boundary findings" below). This preset is built **only** from entries
those four reports marked `CONFIRMED`, with every one of the defects above
corrected or excluded rather than shipped. Nothing here was sourced from
`scratchpad/research-microsoft-style.md` (the pre-verification draft)
directly — that file is a candidate checklist, not a source of truth.

## Shipped rules

Severity policy: structural/document-mechanics rules (heading, list, table,
alt-text, link-text mechanics) are `error`, matching `recheck/google`'s
convention. The A-Z word list's three "unconditional" tiers (general
terminology, accessibility/people-first language, spelling/hyphenation) also
ship at `error`, per the research's own "ship at error" framing for those
tiers (§5a/§5b/§5c headers) — once Tier 4's audience-conditional entries are
removed, every verifier confirmed the remainder as genuinely unconditional.
Everything else (voice, contractions, punctuation conventions, UI-verb
terminology, and any rule whose detection mechanism is a narrowed heuristic
rather than a complete test) is `warn`.

### Structural (heading, list, table, alt-text, link mechanics) — `error` unless noted

| Rule id                                             | Source URL                                                                                                                                                          | Quote                                                                                                    | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `microsoft/heading-sentence-case`                   | [capitalization](https://learn.microsoft.com/en-us/style-guide/capitalization)                                                                                      | "Microsoft style uses sentence-style capitalization."                                                    | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `microsoft/capitalize-after-heading-colon` (`warn`) | [colons](https://learn.microsoft.com/en-us/style-guide/punctuation/colons)                                                                                          | "Always capitalize the word after the colon."                                                            | CONFIRMED, scoped to headings only — the mid-sentence-colon form is merely "Acceptable" per the guide's own table, not shipped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `microsoft/no-trailing-punctuation`                 | [headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings)                                                                                | "Don't end headings with a period."                                                                      | CONFIRMED — default punctuation set (`.,;:` with `?` stripped) already matches Microsoft's own `?`-allowed/`!`-rarely exceptions with no override                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `microsoft/no-ampersand-in-headings` (`warn`)       | [headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings)                                                                                | "Don't use ampersands (&) or plus signs (+) in headings unless..."                                       | CONFIRMED, `exceptions.lines` for `C++`/`A+`/`.NET`; `&` pattern excludes `&amp;`/`&nbsp;`/`&lt;`/`&gt;`/`&quot;`/numeric entities                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `microsoft/vs-in-headings` (`warn`)                 | [versus-vs](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/v/versus-vs)                                                               | "In headings, use the abbreviation vs., all lowercase."                                                  | CONFIRMED, scoped to `heading`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `microsoft/versus-in-text` (`warn`)                 | same                                                                                                                                                                | "In text, spell out as versus."                                                                          | CONFIRMED, scoped to `[paragraph, list-item, table.cell]` — two scoped rules with opposite directions so they don't fight each other                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `microsoft/no-multiple-blanks`                      | [headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings)                                                                                | "Don't use extra line breaks to increase heading spacing."                                               | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `microsoft/no-emphasis-as-heading`                  | [writing-all-abilities](https://learn.microsoft.com/en-us/style-guide/accessibility/writing-all-abilities)                                                          | "Use heading levels instead of text formatting to communicate... hierarchy."                             | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `microsoft/no-apostrophe-plural-decade` (`warn`)    | [apostrophes](https://learn.microsoft.com/en-us/style-guide/punctuation/apostrophes)                                                                                | "Don't use an apostrophe... to form the plural of a singular noun."                                      | CONFIRMED, scoped to the unambiguous decade case (`1990's`); a bare `[A-Z]{2,}'s` (e.g. `API's`) is excluded — frequently a legitimate possessive                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `microsoft/article-before-acronym` (`warn`)         | [acronyms](https://learn.microsoft.com/en-us/style-guide/acronyms)                                                                                                  | "a DLL / an ISP / a URL / a SQL database"                                                                | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `microsoft/list-item-capital`                       | [lists](https://learn.microsoft.com/en-us/style-guide/scannable-content/lists)                                                                                      | "Begin each item in a list with a capital letter."                                                       | CONFIRMED, custom-regex `capitalization` (not `$sentence`, which would overshoot)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `microsoft/no-trailing-conjunction-list` (`warn`)   | [lists](https://learn.microsoft.com/en-us/style-guide/scannable-content/lists)                                                                                      | "Don't use semicolons, commas, or conjunctions... at the end of list items."                             | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `microsoft/no-ellipsis-column-header` (`warn`)      | [tables](https://learn.microsoft.com/en-us/style-guide/scannable-content/tables)                                                                                    | "Don't use ellipses at the end of column headers."                                                       | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `microsoft/no-blank-table-cell` (`warn`)            | [tables](https://learn.microsoft.com/en-us/style-guide/scannable-content/tables)                                                                                    | "Don't leave a cell blank or use an em dash. Instead, use Not applicable or None."                       | CONFIRMED, **em dash only** — the guide's other half ("don't leave a cell blank") is NOT enforced: a truly blank `table.cell` segment's content is the empty string, and every `pattern` token can only ever produce a zero-width match against `''`, which pattern.ts deliberately skips (no real text to report) — an architectural limit of the `pattern` assertion, not a missed narrowing pass. See the rule's doc comment in `config/presets/microsoft.ts` for the full reasoning and what a real fix would require (a token rule or an extractor-level change). The draft's original broader pattern also matched an en dash/hyphen, which the guide never names for this rule either. |
| `microsoft/single-space-after-punctuation` (`warn`) | [periods](https://learn.microsoft.com/en-us/style-guide/punctuation/periods) + [top-10-tips](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice) | "Put one space, not two, after a period" — top-10-tips broadens to "periods, question marks, and colons" | CONFIRMED, widened scope per verifier F's note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `microsoft/no-space-around-em-dash` (`warn`)        | [dashes-hyphens](https://learn.microsoft.com/en-us/style-guide/punctuation/dashes-hyphens/)                                                                         | "Don't use spaces around em dashes."                                                                     | CONFIRMED, **narrowed to em dash only** — the en-dash rule has an explicit worked exception for UI timestamps/date ranges ("2:15 PM – 4:45 PM") a blind regex can't distinguish from the ordinary case; en-dash spacing is not enforced at all                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `microsoft/no-from-before-en-dash-range` (`warn`)   | [numbers](https://learn.microsoft.com/en-us/style-guide/numbers)                                                                                                    | "Don't use from before a range indicated by an en dash."                                                 | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `microsoft/straight-quotes` (`warn`)                | [quotation-marks](https://learn.microsoft.com/en-us/style-guide/punctuation/quotation-marks)                                                                        | "Use straight quotation marks. Segoe Sans... does not have a curly quotation mark option."               | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `microsoft/spell-out-ordinals` (`warn`)             | [numbers](https://learn.microsoft.com/en-us/style-guide/numbers)                                                                                                    | "Always spell out ordinal numbers."                                                                      | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `microsoft/ordinal-no-ly` (`warn`)                  | [numbers](https://learn.microsoft.com/en-us/style-guide/numbers)                                                                                                    | "Don't add -ly to an ordinal number, as in firstly or secondly."                                         | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `microsoft/noon-midnight` (`warn`)                  | [numbers](https://learn.microsoft.com/en-us/style-guide/numbers)                                                                                                    | "Don't use numerals for 12:00. Use noon or midnight instead."                                            | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `microsoft/no-alt-text`                             | [alternative-text](https://learn.microsoft.com/en-us/style-guide/accessibility/alternative-text)                                                                    | "Add alt text to all images that convey important meaning."                                              | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `microsoft/alt-text-length` (`warn`)                | same                                                                                                                                                                | "Limit the length to 150 characters."                                                                    | CONFIRMED — structural number                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `microsoft/alt-text-format` (`warn`)                | same                                                                                                                                                                | "Begin alt text with a capital letter. End it with a period."                                            | CONFIRMED, incomplete — the guide's own carve-out ("even if it's just a fragment, if doing so is practical for the image type") is not modeled; see "Known limitations"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `microsoft/alt-text-generic-opener` (`warn`)        | same                                                                                                                                                                | "Don't start alt text with 'Image.'" / "Don't start... with 'Button' or 'Link.'"                         | CONFIRMED — `Screenshot`/`Diagram`/`Photograph`/`Chart`/`Drawing` are prescribed openers, deliberately absent from the pattern                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `microsoft/alt-text-no-filename` (`warn`)           | same                                                                                                                                                                | "Don't use the file name of an image as alt text."                                                       | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `microsoft/descriptive-link-text`                   | [urls-web-addresses](https://learn.microsoft.com/en-us/style-guide/urls-web-addresses)                                                                              | "rather than a generic phrase like click here"                                                           | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

### Structural numbers (`warn`) — see the dedicated section below

`microsoft/paragraph-length`, `microsoft/list-length`, `microsoft/comma-density`.

### Voice, contractions — `warn`

| Rule id                             | Source URL                                                                                                                                                                            | Quote                                                                                           | Verdict                                                                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `microsoft/use-contractions`        | [use-contractions](https://learn.microsoft.com/en-us/style-guide/word-choice/use-contractions) + [top-10-tips](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice) | "Use contractions like it's, you'll, you're, we're, and let's."                                 | CONFIRMED — the signature Microsoft rule and the sharpest voice difference from other guides. Every pair is a clean word-for-word contraction; `applyMatchCase` verified to handle sentence-initial capitalized matches correctly ("Do not" → "Don't"). |
| `microsoft/no-awkward-contractions` | [use-contractions](https://learn.microsoft.com/en-us/style-guide/word-choice/use-contractions)                                                                                        | "Avoid ambiguous or awkward contractions, such as there'd, it'll, and they'd."                  | CONFIRMED                                                                                                                                                                                                                                               |
| `microsoft/contraction-consistency` | same                                                                                                                                                                                  | "don't use can't and cannot in the same UI."                                                    | CONFIRMED — textbook fit for first-seen-wins `consistency`                                                                                                                                                                                              |
| `microsoft/no-weak-phrasing`        | [top-10-tips](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice)                                                                                                  | "Avoid weak phrasing like there is, there are, and there were."                                 | CONFIRMED                                                                                                                                                                                                                                               |
| `microsoft/avoid-please`            | [a-z/please](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/p/please)                                                                                   | "Avoid please except in situations where the customer is asked to do something inconvenient..." | CONFIRMED                                                                                                                                                                                                                                               |

### US spelling, Latin abbreviations, simple words — `error` (mechanical, per the research's "ship at error" framing)

| Rule id                            | Source URL                                                                                                           | Quote                                                                                       | Verdict                                                                                                                                                                                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `microsoft/us-spelling`            | [use-us-spelling](https://learn.microsoft.com/en-us/style-guide/word-choice/use-us-spelling-avoid-non-english-words) | "use the US spelling. For example, use license, not licence."                               | CONFIRMED — a subset not already covered by `recheck/prose`'s `consistency` rule (behavior/color/license/organize)                                                                                                                                                               |
| `microsoft/no-latin-abbreviations` | same                                                                                                                 | "Avoid Latin abbreviations for common English phrases."                                     | CONFIRMED for e.g./i.e./viz./ergo/de facto/ad hoc/vis-a-vis. `via` deliberately dropped (see self-contradictions section)                                                                                                                                                        |
| `microsoft/simple-words`           | [use-simple-words](https://learn.microsoft.com/en-us/style-guide/word-choice/use-simple-words-concise-sentences)     | "Choose simple verbs without modifiers." / "Don't use two or three words when one will do." | CONFIRMED                                                                                                                                                                                                                                                                        |
| `microsoft/leverage`               | [avoid-jargon](https://learn.microsoft.com/en-us/style-guide/word-choice/avoid-jargon)                               | "using leverage to mean take advantage of"                                                  | CONFIRMED — split into its own rule so its `link:` points at the page that actually states it                                                                                                                                                                                    |
| `microsoft/glyph`                  | same                                                                                                                 | "such as symbol instead of glyph"                                                           | CONFIRMED                                                                                                                                                                                                                                                                        |
| `microsoft/bucketize`              | [dont-use-common-words](https://learn.microsoft.com/en-us/style-guide/word-choice/dont-use-common-words-in-new-ways) | "Don't create a new word from an existing word."                                            | CONFIRMED                                                                                                                                                                                                                                                                        |
| `microsoft/impact-verb` (`warn`)   | same                                                                                                                 | "Don't use verbs as nouns or nouns as verbs"                                                | CONFIRMED, narrowly anchored to `impact` immediately followed by a specific object noun (performance/productivity/quality/reliability/availability/latency/throughput) — bare "impact" is also a common, correct noun ("the impact of this change") per verifier E's own caution |
| `microsoft/the-ask` (`warn`)       | [dont-use-common-words](https://learn.microsoft.com/en-us/style-guide/word-choice/dont-use-common-words-in-new-ways) | "respond to the request" vs. "respond to the ask"                                           | CONFIRMED                                                                                                                                                                                                                                                                        |

### Bias-free, militaristic, derogatory language — `error` (sensitive category)

| Rule id                                  | Source URL                                                                                                                                                                                           | Quote                                                                                                                                                                               | Verdict                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `microsoft/bias-free-terms`              | [bias-free](https://learn.microsoft.com/en-us/style-guide/bias-free-communication)                                                                                                                   | chairman→chair; mankind→humanity; manmade→synthetic; manpower→workforce; salesman→sales representative; DMZ→perimeter network                                                       | CONFIRMED. `master/slave` deliberately NOT included in this rule's pairs — it ships separately as `microsoft/master-slave`, see next row and the self-contradictions section                                                                             |
| `microsoft/master-slave`                 | [bias-free](https://learn.microsoft.com/en-us/style-guide/bias-free-communication) + [a-z/master-slave](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/m/master-slave) | "primary/subordinate ← master/slave" (bias-free); "Don't use master/slave. Use primary/replica or alternatives such as primary/secondary, principal/agent, controller/worker" (a-z) | CONFIRMED both pages ban the term; the two pages disagree only on the replacement — added in the task-10 fix wave as `pattern` (detection-only), naming both candidates in its message rather than shipping neither direction. See "Self-contradictions" |
| `microsoft/cyberattack-spelling`         | [militaristic-language](https://learn.microsoft.com/en-us/style-guide/militaristic-language)                                                                                                         | "add cyber- in front of threat so it reads cyberthreat, all one word no space no hyphen"                                                                                            | CONFIRMED — spelling normalization only; the guide's separate "needs a qualifier in front of it" test is not mechanically decidable and is not enforced                                                                                                  |
| `microsoft/no-derogatory-slang`          | [bias-free](https://learn.microsoft.com/en-us/style-guide/bias-free-communication)                                                                                                                   | "Don't use profane or derogatory terms, such as pimp or bitch." / "spirit animal"                                                                                                   | CONFIRMED, detection-only (no safe fixed replacement for any of these)                                                                                                                                                                                   |
| `microsoft/racial-ethnic-capitalization` | same                                                                                                                                                                                                 | "Use title-style capitalization for Asian, Black and African American, Hispanic and Latinx..."                                                                                      | CONFIRMED, case-sensitive match (only genuinely-lowercase forms flagged); `white`/`multiracial` (which the guide says to LOWERCASE) deliberately excluded — a bare capitalized "White" collides constantly with unrelated proper nouns                   |

**Note on the militaristic-language word bundle:** the broader "kill chain /
blast radius / locked down / threat intel / defense-in-depth approach /
frontline analysts / first line of defense" bundle from the research draft
is **not shipped**. Verifier E found the draft's "12 never-use terms" count
factually wrong (the live list has 9 bullet groups / 17 individual terms)
and "threat intel" mis-sourced within the page — the underlying content is
real, but no verifier independently confirmed exact replacement text for
each multi-word term, and guessing at replacement values for a bundle
already shown to contain counting/sourcing errors was judged too risky.
Only the one mechanically clean, precisely quoted sub-rule (`cyber attack`
→ `cyberattack` spelling) ships.

### Accessibility term collection (Tier 2) — `error`, detection-only

`microsoft/accessibility-terms` — see the dedicated "Tier 2 design" section
below.

### Spelling and hyphenation normalization (Tier 3) — `error`

`microsoft/spelling-hyphenation`, `microsoft/tooltip-capitalization` — pure
mechanics (email/database/endpoint/website/webpage/workstation/screenshot/
taskbar/namespace/plugin/e-commerce/e-learning/e-book/cybersecurity/
coauthor/dial-up/read-only/context-sensitive/single sign-on/multifactor/
multicloud/multitenant/wellbeing/tooltip normalization). CONFIRMED per the
research's own Tier 3 table; the "ToolTip" config-mechanics bug (see
"Section 3" below) is fixed by splitting it into its own case-sensitive
rule rather than sharing the case-insensitive "tool tip" pattern's flag.

### CASE-ONLY (`fix: false`) — `error`, detection-only

`microsoft/az-case-only`: `Internet`/`Intranet`/`Extranet` → lowercase,
`Big Data` → `big data`, `Euro` → `euro`, `Dark Mode`/`darkmode` →
`dark mode`, `Devops`/`devops` → `DevOps`, `bluetooth` → `Bluetooth`,
`boolean` → `Boolean`, `Javascript`/`javascript` → `JavaScript`,
`World Wide Web` → `web`, `WWW` → `www`, `Registry` → `registry`, `Spam` →
`spam`. Every pair here is confirmed by at least one verifier as CASE-ONLY:
`applyMatchCase` reapplies the MATCH's observed casing to the replacement,
so fixing (say) sentence-initial "Internet" reproduces "Internet" — a
silent, permanent no-op. `fix: false` ships instead of a fix that appears
to work but never changes anything.

### VERB-ABLE (`fix: false`, message says "rewrite") — `error`, detection-only

`microsoft/az-verb-able`: `blacklist` → `block list`, `whitelist` →
`allow list`, `allowlist` → `allow list`, `blocklist` → `block list`. Each
avoid-term is documented as also usable as a verb ("whitelist an email
address," "add-list the address"); the replacement is a noun phrase, so a
blind fix produces ungrammatical output ("allow list an email address").

### A-Z word list (Tier 1), thematic groups — `error`

`microsoft/az-state-failure`, `microsoft/az-lifecycle-verbs`,
`microsoft/az-judgment-words`, `microsoft/actionable` (detection-only —
adjective/relative-clause mismatch, see below), `microsoft/az-geography`,
`microsoft/az-direction-layout`, `microsoft/az-ui-nouns`,
`microsoft/az-typography`, `microsoft/az-filesystem`,
`microsoft/az-grammar-usage`, `microsoft/az-abbreviations-names`,
`microsoft/az-navigation`, `microsoft/az-no-replacement` (detection-only —
no fixed replacement given anywhere for these terms), `microsoft/az-real-replacements`.

Every pair in these fourteen rules is CONFIRMED unconditional by at least
one verifier, with Tier 4 conflicts, developer-audience carve-outs, and
substring/homograph-risk terms excluded per the sections below. `actionable`
ships as `pattern`, not `swap`: "actionable" is an adjective and its
replacement ("that you can act on") is a relative clause — a direct
substitution is ungrammatical in most positions ("actionable insights" →
"that you can act on insights"), so this is detection-only with a
"rewrite" message, the same class of fix-safety issue as VERB-ABLE, just
adjective-for-clause instead of verb-for-noun.

### UI verbs and checkbox/dialog terminology — `warn`

| Rule id                                    | Source URL                                                                                                                                                           | Quote                                                                                                         | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `microsoft/no-click`                       | [describing-interactions-with-ui](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/describing-interactions-with-ui)                             | "Don't use input-specific verbs, such as click or swipe."                                                     | CONFIRMED — **the single sharpest divergence from `recheck/google`**, which allows "click". Anchored with a negative lookbehind/lookahead to exclude the hyphen-joined compounds `double-click`/`right-click` (a real substring risk: `\bclick\b` DOES match inside "double-click" once a hyphen precedes it, since a hyphen is a non-word character) and the unrelated compounds `clickstream`/`clickthrough`. Verified via a dedicated fix-safety test. |
| `microsoft/press-key-verb`                 | [a-z/hit](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/h/hit)                                                                        | "Don't use press, depress, hit, or strike [to describe pressing a key]. Use select instead."                  | CONFIRMED, narrowly anchored to recognizable key-press phrasing (Enter/Tab/Esc/Delete/etc., or "the ... key") — bare "press"/"hit"/"strike" are far too polysemous (press releases, press charges, hit a milestone, strike a balance) to match unconditionally                                                                                                                                                                                            |
| `microsoft/checkbox-verbs`                 | [describing-interactions-with-ui](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/describing-interactions-with-ui)                             | "Clear \| Clearing the selection from a checkbox."                                                            | CONFIRMED for `uncheck`/`unmark`/`unselect` → `clear`. Bare `check`/`deselect` deliberately excluded: "check" is extremely polysemous, and "deselect"'s replacement differs by UI-element type ("clear" for checkboxes, "cancel the selection" elsewhere) in a way a blind swap can't resolve                                                                                                                                                             |
| `microsoft/dialog-terminology`             | [formatting-text-in-instructions](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/formatting-text-in-instructions)                             | "Don't use pop-up window, dialog box, or dialogue box."                                                       | CONFIRMED                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `microsoft/mouse-over`                     | [mouse-and-mouse-interaction-terms](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/term-collections/mouse-and-mouse-interaction-terms) | "Don't use mouse over or move the mouse pointer to."                                                          | CONFIRMED (conditionally OK for beginner-skill content per the same page — low risk for reference documentation)                                                                                                                                                                                                                                                                                                                                          |
| `microsoft/keyboard-shortcut-plus-spacing` | [formatting-text-in-instructions](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/formatting-text-in-instructions)                             | "Don't put a space around the plus sign (+) in keyboard shortcuts."                                           | CONFIRMED, detection-only — `swap` replacements are literal (Constraint 2), and the fix would need to reproduce whichever modifier key matched, which needs capture-group interpolation the engine does not support                                                                                                                                                                                                                                       |
| `microsoft/sign-in-sign-out`               | [log-on-log-off](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/l/log-on-log-off)                                                      | "Don't use log in, login, log into, log on... unless it appears in the UI (and you're writing instructions)." | CONFIRMED, `fix: false` — "login"/"logon" are frequently used as NOUNS or adjectives ("the login page", "your login credentials"), where "sign in" (a verb phrase) does not slot in grammatically. The guide's exception is also a two-part test (UI match AND instructions context) neither this nor the research draft attempts to model — flagged here as a known limitation, not silently dropped                                                     |

## Excluded candidates

Every candidate below was checked by one of the four verification passes
(or, where marked, judged independently by this preset's author) and is
**not** shipped, with the reason. This section exists so "why doesn't
`recheck/microsoft` check X?" has a documented answer instead of looking
like an oversight.

### Tier 4 (audience-conditional / UI-conditional) — never ships

See "Rule 0" below for the full ten-plus-list with citations.

### Self-contradictions — enforced in neither direction

See the dedicated section below: `%`/percent, `etc.`, forced line breaks.
(`master/slave` was also a self-contradiction, but ships detection-only as
`microsoft/master-slave` as of the task-10 fix wave — it is no longer in
the "neither direction" set; see the section's own subsection.)

### Inverted, wrong, or non-guidance entries — corrected or dropped

See "Section 3" below: `shaded`, `boot`→`open`, `corrupted`→`damaged`,
`invalid`→`not valid`, "afflicted with" (fabrication), the `ToolTip`
config bug.

### Developer-audience carve-outs (Redocly-specific) — never ships

`header`, `context menu`, `disk`, `directory` — see the dedicated section below.

### TOO-RISKY (guide confirms it, but the avoid-term is too ordinary/polysemous or audience-conditional to blind-match)

Fix wave B / Step 6.3: every row below now carries its own source URL(s) —
the stated bar for this table is rule + URL + reason, and a reason without
a citation isn't verifiable by a future reader.

| Candidate                                                                                                                                                                                                                       | Why excluded                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Source(s)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deprecated` → `obsolete`; `user` → `customer`; `client` (a person) → `customer`; `utility` → `tool`; `cursor`; `machine` → `computer`; `start` (an app) → `open`                                                               | Each carries an explicit or de-facto developer/technical-audience carve-out that directly applies to Redocly's own documentation — see "Additional tier-boundary findings" above.                                                                                                                                                                                                                                                                                                                                                                                    | [d/deprecated](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/d/deprecated), [u/user-end-user](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/u/user-end-user), [c/client](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/c/client), [u/utility](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/u/utility), [mouse-mouse-interaction-terms](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/term-collections/mouse-mouse-interaction-terms), [computer-device-terms](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/term-collections/computer-device-terms), [o/open](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/o/open) |
| `freeze`/`frozen` (as system-hang synonyms)                                                                                                                                                                                     | Sense-ambiguous: "freeze an account," "freeze a value," "deep freeze" are all common, unrelated, correct uses; the guide's own carve-out ("as a synonym for stop responding") names a specific sense a blind swap can't isolate.                                                                                                                                                                                                                                                                                                                                     | [f/freeze-frozen](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/f/freeze-frozen)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `header`/`head` → `heading`; `context menu` → `shortcut menu`; `disk` → `hard drive`; `directory` → `folder`; `field`/`entry field` → `box`; `attribute` (meaning property) → `property`; `issue` (meaning problem) → `problem` | Each has a common, correct, unrelated technical sense in API/developer documentation (HTTP header, context menu in a sample app, managed disk, working directory, JSON field, XML attribute, GitHub issue / "issue a token") that a blind match would corrupt.                                                                                                                                                                                                                                                                                                       | [h/header](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/h/header), [c/context-menu](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/c/context-menu), [d/disk](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/d/disk), [d/directory](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/d/directory), [f/field](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/f/field), [a/attribute](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/a/attribute), [i/issue](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/i/issue)                                                                                                           |
| `radio button`, `scroll`, `Microsoft's` (possessive), x-multiplication, `shortcut key`                                                                                                                                          | Tier-4/Tier-1 crossings — see Rule 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | [r/radio-button](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/r/radio-button), [s/scroll](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/s/scroll), [m/microsoft](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/m/microsoft), [m/multiplication-sign](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/m/multiplication-sign), [keys-keyboard-shortcuts](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/term-collections/keys-keyboard-shortcuts)                                                                                                                                                                                                                                      |
| `may` (ability modal)                                                                                                                                                                                                           | Homograph collision with the proper noun "May" (the month) — `ignoreCase: true` (needed to catch sentence-initial "May") would flag "released in May 2024" as a modal verb.                                                                                                                                                                                                                                                                                                                                                                                          | [c/can-may](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/c/can-may)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `that` (referring to people) → `who`                                                                                                                                                                                            | One of the most common words in English; only a small fraction of occurrences refer to people. A literal `swap` would be extraordinarily noisy; the guide's own quote scopes the objection to a use a `pattern`/`swap` can't isolate.                                                                                                                                                                                                                                                                                                                                | [w/who-vs-that](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/w/who-vs-that)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `star` → `asterisk`                                                                                                                                                                                                             | Ordinary English word (star rating, star performer) with a narrow, Microsoft-documented exception (OK for a phone-keypad key) a blanket swap would miss in both directions.                                                                                                                                                                                                                                                                                                                                                                                          | [keys-keyboard-shortcuts](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/term-collections/keys-keyboard-shortcuts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `+` (plus sign, in text)                                                                                                                                                                                                        | Single punctuation character; collides with `C++`, query strings, and ordinary arithmetic in code-adjacent prose.                                                                                                                                                                                                                                                                                                                                                                                                                                                    | [p/plus-sign](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/p/plus-sign)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `field`, `attribute`, `issue`                                                                                                                                                                                                   | See row above — TOO-RISKY for Redocly's schema/API documentation specifically.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | (same as above)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `foo`/`foobar`/`fubar` (as placeholders)                                                                                                                                                                                        | "OK to use... in content for a technical audience" — Redocly's docs qualify.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | [f/foo-foobar-fubar](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/f/foo-foobar-fubar)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `Internet Service Provider`/`Key Performance Indicator` (C20 illustrative pairs)                                                                                                                                                | The general principle (lowercase spelled-out acronym forms) is CONFIRMED, but these specific phrase pairs were not independently re-quoted as live-page examples by any verifier — dropped rather than shipped on the author's own unverified guess.                                                                                                                                                                                                                                                                                                                 | [acronyms](https://learn.microsoft.com/en-us/style-guide/acronyms) (general principle only; no per-phrase page exists to cite)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `API's`/`URL's`/`SDK's` → `APIs`/`URLs`/`SDKs` (C18)                                                                                                                                                                            | The general "add lowercase s, not an apostrophe" principle is CONFIRMED, but a bare `[A-Z]{2,}'s` is frequently a legitimate POSSESSIVE ("the API's response"), not an attempted plural — verifier G's own note flags this exact ambiguity. Excluded entirely; only the unambiguous decade-plural case (`microsoft/no-apostrophe-plural-decade`) ships.                                                                                                                                                                                                              | [acronyms](https://learn.microsoft.com/en-us/style-guide/acronyms)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `property sheet`/`property page` → "dialog box or tab"; `application developer` → "software developer, web developer, developer, or programmer"                                                                                 | Multiple, meaningfully different acceptable replacements — no single canonical swap target can be chosen without guessing which the guide's authors intended for a given context.                                                                                                                                                                                                                                                                                                                                                                                    | [p/property-sheet-property-page](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/p/property-sheet-property-page), [a/application-developer-app-developer](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/a/application-developer-app-developer)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Broader militaristic-language bundle (`kill chain`, `blast radius`, `locked down`, `threat intel`, `defense-in-depth approach`, `frontline analysts`, `first line of defense`)                                                  | See the note under "Bias-free, militaristic, derogatory language" above — content confirmed real, but no verifier independently quoted exact replacement text for each multi-word term, and the same page's "12 never-use terms" count was already shown to be wrong.                                                                                                                                                                                                                                                                                                | [militaristic-language](https://learn.microsoft.com/en-us/style-guide/militaristic-language)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `corrupt`/`corrupted` (detection-only)                                                                                                                                                                                          | Considered as a `pattern` fallback after ruling out the `swap` to "damaged"; ultimately not shipped at all — the guide's own instruction ("offer help fixing it if possible") is a request for an empathetic, context-dependent rewrite, not a term to flag mechanically.                                                                                                                                                                                                                                                                                            | [c/corrupted](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/c/corrupted)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| C21 acronym first-mention expansion                                                                                                                                                                                             | See "Known limitations" #5.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | [acronyms](https://learn.microsoft.com/en-us/style-guide/acronyms)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Broader "spell out & / + / ~ in prose" (A9)                                                                                                                                                                                     | NOISY in developer docs outside heading/list-item/alt scope (query strings, HTML entities, code-adjacent `&&`); the one high-value case (ampersands in HEADINGS specifically) is already covered by `microsoft/no-ampersand-in-headings`.                                                                                                                                                                                                                                                                                                                            | [headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `no-possessive-product-names` (C16, "Don't use Microsoft's")                                                                                                                                                                    | **Not shippable at all**, conditionally or not — see below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | [m/microsoft](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/m/microsoft)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `SMB` → "small or medium-sized business"                                                                                                                                                                                        | Fix wave B / Step 4 drop, added here in fix wave C to give it a URL + reason row (it previously existed only in the narrative "Fix wave B / Step 4" prose below, which this table's own stated purpose — "why doesn't `recheck/microsoft` check X?" — doesn't cover). Bare, case-shouted acronym with a common, correct, unrelated technical sense in exactly Redocly's domain: SMB as the Server Message Block network protocol ("mount the SMB share"). No syntactic anchor distinguishes either sense — both are just the bare acronym in ordinary noun position. | [s/smb](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/s/smb)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `SKU` → "subscription, edition, version, or tier"                                                                                                                                                                               | Fix wave B / Step 4 drop, same table-completeness reason as `SMB` above. Common, correct, unrelated e-commerce/inventory sense ("the SKU field") with no syntactic anchor separating it from Microsoft's intended sense. Carries a second, independent hazard even where the guide's sense IS intended: the guide names FOUR acceptable alternatives, not one, so no single canonical swap target exists either.                                                                                                                                                     | [s/sku](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/s/sku)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `terminate` → "close"                                                                                                                                                                                                           | Fix wave B / Step 4 drop, same table-completeness reason as `SMB`/`SKU` above. "Terminate the instance/process/session/connection" is standard, correct cloud-infrastructure vocabulary throughout Redocly's own API-documentation domain (a genuine meaning change, not a false match: the guide's sense is "close an app or window"), and no reliable positional anchor separates that sense from the guide's UI sense the way `exit`'s determiner-based anchor does.                                                                                              | [t/terminate](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/t/terminate)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Every URL in the "Source(s)" column above was re-verified live (`curl`,
HTTP 200) during this fix wave — see `sources.json` for the ones this
preset also hashes; the handful used only for citation here (not hashed,
since no shipped rule links to them) are noted inline instead.

### C16 ("Don't use the possessive form of a product/trademark name") — excluded entirely, not just softened

The live guide's actual rule is narrower than the research draft's config:
"Don't use Microsoft's" specifically means don't use the possessive
immediately before a TRADEMARK/product name (e.g. "Microsoft's Azure
services" should be "Azure services"), while "it's OK to use Microsoft's
occasionally when referring to the company itself" — with the guide's own
worked example, "Microsoft's privacy policies." A linter cannot
mechanically distinguish "Microsoft's <trademark>" from "Microsoft's
<general reference to the company>" — the operative distinction is
semantic, not syntactic. Shipping either an unconditional ban (flags the
guide's own approved example) or a heuristic scoped to a hardcoded product
list (requires a project-specific brand vocabulary this preset has
otherwise declined to ship — see `proper-names` below) was judged worse
than not shipping the rule at all. `microsoft-clean.md`'s test asserts
"Microsoft's" (used of the company) produces zero findings — trivially
true here, since no rule targets the string at all.

### Project-specific brand vocabulary — not shipped, matching `recheck/google`'s precedent

`recheck/google` does not ship a `proper-names` rule (brand/product-name
casing is left to the user's own config, not baked into the style-fidelity
preset). `recheck/microsoft` follows the same precedent: C15 ("product/
service names get consistent, exact casing") is CONFIRMED content, but no
`microsoft/proper-names` rule ships — a hardcoded product-name list is
Redocly's own vocabulary, not something the Microsoft guide provides.

### NOT-ENFORCEABLE (real guide content, requires human judgment or structure Recheck doesn't have)

| Candidate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Why excluded                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V19-V22, V37-V39 (noun+verb contractions, active voice, subjunctive mood, verb-first sentences, modifier stacks, that/who omission, -ing word care)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Each requires POS tagging or grammatical-role judgment beyond regex/AST primitives.                                                                                                                                                                                                                                                                                                                                                 |
| C10 (second-level headings need ≥2 siblings), C11 (no two headings in a row), L4 (periods only on complete sentences), L5 (per-list punctuation consistency), L7 (list parallelism), T1 (table sentence-case — NOISY, reference tables are dense with identifiers/proper nouns), T4 ("Name" is a bad column header — NOISY, "Name" is genuinely correct in many API reference tables), T5/T6/T10 (table intro-sentence rules, minimum table dimensions), P3/P4/P6/P8/P9/P10-P12 (multiple-hyphens-for-dash, en-dash-for-minus, from/through ranges, closing-quote placement, mid-sentence colon rules, colon-before-block), N1/N2/N6/N7/N9/N11 (spell out 0-9, no sentence-initial numerals, no K/M/B abbreviation, comma grouping, spell out months, decimal leading zero) | Each is confirmed content, but every one carries either a documented exception too common to ignore (space-limited UI text, "if one item requires a numeral," page numbers/addresses/decimals) or needs structural context (paragraph→table/list/heading adjacency) Recheck's segment model doesn't expose — matching the research draft's own NOISY/NOT-ENFORCEABLE verdicts, independently re-confirmed rather than re-litigated. |
| U5 (don't name the UI element type unless it adds clarity), U8 (file extensions lowercase / device names uppercase), U9 (bold not italic for work titles), A7 (directional terms as the only clue to location), W1-W4 (URL formatting/bare-URL rules)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | "Unless it adds needed clarity" and "as the only clue" are judgment calls; the URL rules were separately judged too weakly cited (W4) or too noisy in a docs site full of real clickable links (W1/W2) to attribute to Microsoft specifically — available generically via `recheck/markdown`'s `no-bare-urls` if wanted.                                                                                                            |
| S1-S4 (link fragments, fenced-code-language, single-H1, consistent bullet/fence/emphasis/table-pipe style)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | The research draft itself labels these "House rule; no Microsoft statement" — no live-page citation exists for any of them, so none ship under a Microsoft attribution (unlike `recheck/google`, whose equivalent structural rules ARE independently Google-cited).                                                                                                                                                                 |

## Deliberation and development history

Everything from here on records how the shipped and excluded lists above
were reached: the audience-conditional and developer-specific carve-outs
worked out along the way, the self-contradictions and wrong entries an
earlier draft introduced, the successive fix waves that corrected or
excluded specific pairs, and the axes a pair must clear before auto-fix is
safe. **A reader who only wants provenance can stop reading above this
point** — everything below is for someone auditing or extending this
preset.

### Rule 0 — Tier 4 (audience-conditional / UI-conditional) never ships

Spec §5.6: **never** enforce the audience-conditional tier. The original
research draft's config shipped five terms unconditionally at `error` while
those SAME five also appeared, verbatim, on its own Tier-4 "never enforce"
list:

| Term                 | Live page carve-out                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `execute`            | "Don't use except to follow the UI. Use run instead."                                                 |
| `reboot`             | "If the UI or API uses reboot in a label... it's OK to refer to the label."                           |
| `navigate`           | "You don't need to find an alternative to navigation when it's the most precise word in the context." |
| `ZIP Code`           | "It's OK to use ZIP Code in content that's intended for a US audience only."                          |
| `disjoint selection` | "Don't use... except for a technical audience, and only if the term appears in the UI or API."        |

None of the five ship. Their siblings sharing the exact same conditional
sentence (`contiguous selection`, `nonadjacent selection`, `noncontiguous
selection` — same sentence as `disjoint selection`) are excluded too.

#### The five additional mis-filed entries the corrections doc flagged for evaluation

| Term                           | Carve-out found                                                                                                                                                                                                                                | Disposition                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `shortcut key`                 | Bundled in the same Tier-1 row as `accelerator key, fast key, hot key, quick key, speed key`, but `keys-keyboard-shortcuts` grants it, alone, the identical developer-audience carve-out already accepted for `access key` (correctly Tier 4). | Removed from the row; `accelerator key`/`fast key`/`hot key`/`quick key`/`speed key` still ship (no carve-out for those). |
| `radio button`                 | "Use radio button **only** in content for developers in which the API includes the term."                                                                                                                                                      | Excluded entirely.                                                                                                        |
| `scroll`                       | "It's OK to use scroll in content that teaches beginning skills."                                                                                                                                                                              | Excluded entirely.                                                                                                        |
| x-multiplication (`x` → `×`)   | "Use an asterisk (\*) **if you need to match the UI**" — Tier 4's own defining phrase, verbatim. Also SUBSTRING-RISK (bare `x` collides with `x-axis`/`x-ray`/`x-coordinate`, all hyphen-joined so `\bx\b` DOES match inside them).            | Excluded entirely (double reason).                                                                                        |
| `Microsoft's` (possessive ban) | "Exception: it's OK to use Microsoft's occasionally when referring to the company itself" — with the guide's own worked example, "Microsoft's privacy policies."                                                                               | Excluded entirely — see "C16" above; not shippable at all, conditional or not (see reasoning).                            |

#### Additional tier-boundary findings made while authoring (beyond the ten above)

Verifier G/H's own tables carry a `(cond.)` marker on several more Tier-1
rows that were not individually named by the corrections doc but share the
identical shape. Found by re-reading the verifier tables while authoring,
not pre-flagged:

| Term                                                                                                      | Carve-out                                                                                                                                                                                                                                                                                       | Disposition                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deprecated` → `obsolete`                                                                                 | "Avoid in content for a **technical audience**. Don't use in content for a general audience."                                                                                                                                                                                                   | **Excluded.** Redocly's docs are technical-audience API documentation, and "deprecated" is itself load-bearing OpenAPI vocabulary (the `deprecated: true` field). Shipping this unconditionally would misfire on Redocly's own domain, the same shape as `header`/`context menu`/`disk`/`directory` below.                                                                                  |
| `and/or` → `or`                                                                                           | "Don't use **unless it helps you avoid lengthy, complex wording**."                                                                                                                                                                                                                             | Excluded (not in the shipped word list).                                                                                                                                                                                                                                                                                                                                                    |
| `freeze`/`frozen`                                                                                         | "Don't use freeze **as a synonym for stop responding**" — i.e. only in that one sense; "freeze" has many unrelated senses (freeze an account, freeze a value).                                                                                                                                  | Excluded from `az-state-failure`. **Correction (fix wave B / Step 9):** this row previously said "not verifier-flagged" — false. Verifier G:76 marks it `CONFIRMED (cond.)` with the exact quote above; the exclusion is a real, verifier-confirmed sense-ambiguity call (the same class as `marquee`, which verifier H explicitly calls "context-flipped"), not an unflagged author guess. |
| `user` → `customer`/`person`/etc.                                                                         | "It's OK to use user in content for **developers**."                                                                                                                                                                                                                                            | Excluded — Redocly's docs are developer content, and "user" is one of the most common words in any documentation.                                                                                                                                                                                                                                                                           |
| `cursor` (as opposed to `insertion point`)                                                                | "Use cursor only for a **technical audience**."                                                                                                                                                                                                                                                 | Only `insertion point` → `pointer` ships (unconditional per the same page); bare `cursor` excluded.                                                                                                                                                                                                                                                                                         |
| `machine` → `computer`                                                                                    | "It's OK to use machine in content for a **technical audience** and... virtualization."                                                                                                                                                                                                         | Excluded — "virtual machine", "state machine", "build machine" are all extremely common in Redocly's domain.                                                                                                                                                                                                                                                                                |
| `foo, foobar, fubar`                                                                                      | "OK to use these words as placeholders... in content for a **technical audience**."                                                                                                                                                                                                             | Excluded (Redocly's docs qualify).                                                                                                                                                                                                                                                                                                                                                          |
| `client` (a person) → `customer`                                                                          | Not marked `(cond.)` by the verifier — G:93 states it plainly ("Don't use client to refer to a person. Use customer instead."), no carve-out at all.                                                                                                                                            | Excluded anyway (see the fix-wave-B note directly below — this is a considered "anchoring isn't reliable" call, not silent inference).                                                                                                                                                                                                                                                      |
| `utility` → `tool`                                                                                        | Not marked `(cond.)` either — H:55 is also unconditional ("Use tool, not utility, to describe a feature...").                                                                                                                                                                                   | Excluded anyway (same fix-wave-B note).                                                                                                                                                                                                                                                                                                                                                     |
| `start` (an app) → `open`                                                                                 | Not marked `(cond.)` — G:89 bundles it with `launch` under one unconditional CONFIRMED row. The row bundles `launch, start (an app), boot`; "start" alone is one of the most common words in English with countless unrelated correct senses (start a server, start a request, from the start). | Excluded; only `launch` → `open` and `boot` → `turn on` ship from this row.                                                                                                                                                                                                                                                                                                                 |
| `deinstall`, `machine`, `user`, `client`, `utility` cross-checked against Redocly's own domain vocabulary | —                                                                                                                                                                                                                                                                                               | See individual rows above.                                                                                                                                                                                                                                                                                                                                                                  |

**Fix wave B / Step 8 — these three are inference, not a documented guide
exception, and that distinction matters.** Unlike `header`/`context
menu`/`disk`/`directory` (Section 5 below), where Microsoft's OWN page
states "use X only for developers/technical audience," none of `client`,
`utility`, or `start` carry a live, verifier-quoted conditional for the
developer-audience sense — G:93 and H:55 (above) are flatly unconditional,
and G:89 doesn't carve out `start` either. The exclusion is entirely this
preset's own inference about Redocly's domain, and `PROVENANCE.md` said so
plainly before this note — candor that was good but stopped one step short
of a real disposition. Per the brief's instruction ("ship them anchored, or
document a real guide exception"), anchoring was evaluated for all three
and rejected for a concrete reason, not skipped:

- **`client`** — the person-sense ("the client requested...", "our
  clients") and the software sense ("API client," "client library," "the
  client sends a request") are both extremely common NOUNS in identical
  syntactic positions, with no reliable preceding/following word that
  separates them the way `exit code`/`the product launch`/`boot disk`
  separate Step 4's noun compounds from their verb senses. A negative-
  lookahead anchor (exclude "client" near "library," "SDK," "API," "HTTP,"
  etc.) would still leave bare "Configure the client to retry requests" —
  ordinary, correct API-docs prose — flagged and rewritten to "Configure
  the customer to retry requests." Anchoring isn't reliable; dropped.
- **`utility`** — same shape: "utility function," "utility script," "a
  small utility for X" are all common, bare, developer-docs nouns with no
  positional cue distinguishing them from the guide's intended sense
  (avoiding "utility" as a vague synonym for "tool" in end-user UI copy).
  Anchoring isn't reliable; dropped.
- **`start`** — far higher risk than either of the above: "start" is one of
  the most common verbs in English technical writing ("start the server,"
  "start a request," "restart," "from the start," "get started"), used
  correctly in an enormous range of senses having nothing to do with
  "opening an app." Unlike `launch`/`boot`, which have specific noun-
  compound tells to anchor against, "start" has no comparable narrow
  signature — almost every occurrence would need to be excluded. Anchoring
  isn't reliable; dropped.

All three remain excluded, same as before this wave — but now as an
explicit, reasoned "anchoring considered and rejected" disposition, per
Step 8's own request, rather than a candid-but-open inference note.

### Section 5 — developer-audience carve-outs specific to Redocly

Four Tier-1 candidates carry a Microsoft-documented exception for exactly
the developer/API-documentation audience Redocly serves. **None of the four
ship**, unconditionally or otherwise — running this preset on Redocly's own
docs must not flag any of them:

| Term                                                        | Carve-out                                                                                                                                                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `header` (meaning heading) → `heading`                      | Microsoft's own page confirms "it's OK to use header as a short form of file header, as in HTML header" — the standard, correct term for an HTTP/API request/response header throughout API documentation. |
| `context menu` → `shortcut menu`                            | "Use context menu only in content for developers."                                                                                                                                                         |
| `disk`/`fixed disk`/`hard disk`/`disk drive` → `hard drive` | "Use disk only in the context of Azure cloud storage and virtual machines" — extremely common, correct in cloud/infra API docs.                                                                            |
| `directory` → `folder`                                      | "Use directory only in content for developers... to match the API" — CLI paths, working directory, root directory.                                                                                         |

`microsoft-clean.md` includes a paragraph using all four terms in exactly
this developer sense, and the test suite asserts zero findings on it.

### Section 3 — wrong, inverted, and non-guidance entries corrected

| Entry                             | Problem found                                                                                                                                                                                                                                                                                                                                                                                                                    | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shaded`                          | **Inverted.** The draft bundled it into an avoid-term row (`gray, grayed out, dimmed, shaded, unavailable, disabled`); the live pages state Microsoft **recommends** "shaded" for the appearance of a checkbox representing a mixture of settings.                                                                                                                                                                               | `shaded` does not appear anywhere in this preset, in either direction. **Nor does the rest of that row** — no `grayed out` or `dimmed` rule ships here either (an earlier revision of this table claimed one did; it never existed). `recheck/inclusive-language` covers `grayed out` → `unavailable`, sourced from Google.                                                                                                                                                                                                                                                                                                                                                                           |
| `boot` → `open`                   | Wrong direction AND target. Live page: _"Don't use as a verb. Use turn on to refer to turning on power to a device."_                                                                                                                                                                                                                                                                                                            | Shipped separately as `boot` → `turn on` (`microsoft/az-lifecycle-verbs`), not bundled with `launch`/`open`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `corrupt`/`corrupted` → `damaged` | Not guidance — the source asks for an empathetic sentence **rewrite** ("Try to use a more empathetic statement... offer help"); its own worked example never uses "damaged".                                                                                                                                                                                                                                                     | Not shipped as a swap. (Detection-only was considered and also dropped for scope reasons — see "Excluded candidates".)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `invalid` → `not valid`           | Soft preference: _"Both terms are OK to use, but try to use more specific terms instead"_ — a machine-translation-safety tip, not a "never use" rule.                                                                                                                                                                                                                                                                            | Not shipped.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| "afflicted with" (Tier 2)         | **Fabricated** — appears nowhere on the live `accessibility-terms` page; the actual Row 5 avoid-list is "Affected by, stricken with, suffers from, a victim of, an epileptic."                                                                                                                                                                                                                                                   | Not shipped anywhere. `affected by`/`stricken with`/`suffers from`/`a victim of` (the real Row 5 terms, minus "an epileptic", which needs a sentence rewrite no pattern/swap can safely target) ship in `microsoft/accessibility-terms`.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `ToolTip` regex (Tier 3)          | Config-mechanics bug: a shared `ignoreCase: true` flag on the combined "tool tip"/"ToolTip" pattern made the "ToolTip"-only branch also match the already-correct lowercase "tooltip".                                                                                                                                                                                                                                           | `microsoft/tooltip-capitalization` ships as its OWN case-sensitive (`ignoreCase: false`) rule, separate from `microsoft/spelling-hyphenation`'s case-insensitive "tool tip" (spacing) pattern.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Row-1452 "(all don't use)" bundle | **Under-shipped.** The draft filed the whole bundle as detection-only; six of its members have an explicit, single-value replacement stated on their own page.                                                                                                                                                                                                                                                                   | `friendly name` → `display name`, `print queue`/`printer queue` → `list of documents`, `data record` → `record`, `e-form` → `form`, `upsize` → `scale up` ship in `microsoft/az-real-replacements` (plus `working memory`, `soft copy`, `print out`, `search and replace`, `target drive`/`target file`, which had replacements but weren't singled out by the corrections doc). `property sheet`/`property page` (multi-option: "dialog box or tab") and `application developer` (four very different alternatives: "software developer, web developer, developer, or programmer") are excluded — no single canonical replacement can be chosen without guessing which the guide's authors intended. |
| Tier 2 accessibility table        | **Three crossed pairings.** The draft merged two separate live rows into one, producing wrong swap targets: `handicapped` → `person with a disability` (wrong; that word belongs to Row 3, whose target is "person with limited mobility..."); `differently abled` → `person with a disability` (wrong; Row 9's target is "person with cognitive disabilities, developmental disabilities, learning disabilities, or dyslexia"). | See "Tier 2 design" below — resolved by shipping **detection-only**, sidestepping the wrong-target risk entirely rather than attempting to re-derive every row's exact target from partial verifier quotes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### Self-contradictions — enforced in NEITHER direction (three), plus one escalated

Four cases where two live Microsoft pages give opposite guidance for the
same case were found. Three are still enforced in neither direction (no
rule ships for either side); the fourth, `master/slave`, was escalated in
the task-10 fix wave to ship detection-only — see the dedicated subsection
below the table. Both citations for all four are recorded here regardless,
per the task's instruction:

| Case                                                                               | Page A                                                                                                                                                                             | Page B                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`%` vs. spelled-out "percent"**                                                  | [numbers](https://learn.microsoft.com/en-us/style-guide/numbers) (`ms.date` 2022-05-13): "Use a numeral plus percent to specify a percentage."                                     | [a-z/percent-percentage](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/p/percent-percentage) (`ms.date` 2023-11-15, newer): "Use the percent sign (\"%\") with numerals, rather than spelling out \"percent.\""                                                                             |
| **`master/slave` replacement target** — ESCALATED, ships detection-only, see below | [bias-free](https://learn.microsoft.com/en-us/style-guide/bias-free-communication): "primary/subordinate ← master/slave"                                                           | [a-z/master-slave](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/m/master-slave): "Don't use master/slave. Use primary/replica or alternatives such as primary/secondary, principal/agent, controller/worker" — and separately rejects `primary/subordinate` as a synonym for parent/child. |
| **`etc.`**                                                                         | [use-us-spelling](https://learn.microsoft.com/en-us/style-guide/word-choice/use-us-spelling-avoid-non-english-words): "It's OK to use etc., in situations where space is limited." | [a-z/etc](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/e/etc): "Don't use. Instead be specific. When space is limited, use such as or like."                                                                                                                                               |
| **Forced line breaks**                                                             | [writing-all-abilities](https://learn.microsoft.com/en-us/style-guide/accessibility/writing-all-abilities): "Don't force line breaks... within sentences and paragraphs."          | [headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings): "Break two-line headings carefully... (Shift + Enter inserts a manual line break)."                                                                                                                                                  |

Also note: `via` is dropped from the Latin-abbreviation swap list on
verifier E's own recommendation ("Could not independently confirm 'via'
appears as an example to avoid on any fetched page... Microsoft's own prose
uses it... low confidence either way, drop it").

#### `master/slave` — escalated to detection-only (task-10 fix wave, 2026-07-29)

The original authoring pass read the task brief's Step 3 ("the 4
self-contradictions... enforce NEITHER direction") literally and shipped
`master/slave` in neither direction, flagging in the final report that
verifier E's own resolution note was softer (it suggested the A-Z page's
replacement could still be used as "primary guidance," since the two pages
agree the TERM should be banned and disagree only on the REPLACEMENT). That
escalation was correct to raise, and the project owner's decision is: ship
it, detection-only. Both pages agree `master/slave` must be avoided; they
disagree only on which replacement to name. Shipping nothing would silently
permit `master/slave` in a preset that carries an inclusive-language
mandate — a worse outcome than either replacement choice. `pattern`
(`microsoft/master-slave`, no `swap`, so no fix of any kind is possible)
imposes no replacement at all, so "enforce neither direction" still holds
for the part the guide's two pages actually dispute; its message names
BOTH candidates (`primary/subordinate` from bias-free-communication;
`primary/replica`, or the guide's own further alternatives
`primary/secondary`/`principal/agent`/`controller/worker`, from
a-z/master-slave) so a human picks the one that fits the context, rather
than the tool guessing.

### No `metric` rule

Microsoft's style guide publishes no readability formula or grade-level
target anywhere in the ~340 pages fetched across all four verification
passes. The 7-8 grade / 60-70 Flesch figures some contributors cite come
from `learn.microsoft.com` Q&A threads about Word's **Editor** feature, not
the Writing Style Guide itself (confirmed absent on every fetched page).
Shipping a `metric` rule under a Microsoft citation would misattribute an
invented numeric mandate. Instead, this preset ships the guide's own real
structural numbers:

| Rule                         | Assertion                                              | Guide's number                                                                                  | Source                                                                                           |
| ---------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `microsoft/paragraph-length` | `length`, `unit: sentences`, `max: 7`                  | "Three to seven lines is about the right length for a paragraph."                               | [scannable-content](https://learn.microsoft.com/en-us/style-guide/scannable-content/)            |
| `microsoft/list-length`      | `list-length`, `min: 2, max: 7`                        | "at least two items but (if possible) no more than seven items"                                 | [lists](https://learn.microsoft.com/en-us/style-guide/scannable-content/lists)                   |
| `microsoft/comma-density`    | `occurrence`, pattern `,`, `max: 2`, `scope: sentence` | "If a sentence contains more than a comma or two and ending punctuation, consider rewriting it" | [punctuation](https://learn.microsoft.com/en-us/style-guide/punctuation/)                        |
| `microsoft/alt-text-length`  | `length`, `unit: characters`, `max: 150`, `scope: alt` | "Limit the length to 150 characters."                                                           | [alternative-text](https://learn.microsoft.com/en-us/style-guide/accessibility/alternative-text) |

**Two deliberate deviations from the brief's literal numbers, both found
empirically while building this preset's own clean fixture, both discussed
in the final report:**

1. **"Lines" → "sentences" proxy for `paragraph-length`.** Recheck has no
   concept of a rendered "line" in Markdown — line length depends on
   viewport/font, which is meaningless for a structural check. `length`'s
   `sentences` unit is the closest countable proxy for the guide's stated
   range. This is an intentional substitution, not a literal reading of
   "lines" — flagged so a future reader doesn't mistake it for an exact
   quote.
2. **`paragraph-length` ships only `max: 7`, not `min: 3`.** The brief's
   Step 4 lists "length with unit: sentences for paragraphs" without
   spelling out both bounds explicitly; a `min: 3` floor was tried first
   (matching the guide's "three to seven" range literally) but flagged more
   than a dozen ordinary, correct paragraphs in a realistic
   API-documentation-shaped clean fixture — single-sentence paragraphs
   (a one-line lead-in to a code block, an image caption, a short
   introductory sentence before a list) are commonplace and entirely
   correct in reference documentation. This is the same class of
   over-firing `recheck/google`'s own `list-length` rule avoided by
   shipping only `min` with no `max` (Google states no upper bound, so only
   the floor is enforced). Shipping only the guide's upper bound here still
   enforces its one genuinely actionable direction (a paragraph that has
   grown too long to scan) without penalizing normal short paragraphs.

### Tier 2 design: detection-only by construction, not merely by caution

`microsoft/accessibility-terms` ships as a `pattern` rule (no fixed
replacement target at all), not a `swap`. This is deliberate, not a
fallback: the research draft crossed two of the live table's rows (mapping
"handicapped" and "differently abled" to the WRONG row's replacement, per
verifier H's finding above) and fabricated a third avoid-phrase
("afflicted with"). Detection-only sidesteps that risk entirely: every
avoid-term shipped is independently confirmed as a genuine term to avoid,
but no specific replacement is ever prescribed by the rule itself, so
there is no wrong-target pairing possible — a property that holds
regardless of how many terms the rule covers.

#### Original shipment (task-10, initial pass) — 12 terms, partial table

Only the rows/terms directly quoted in `task-10-verify-H.md` were shipped
at first: `crippled`, `handicapped`, `the handicapped`, `people with
handicaps`, `slow learner`, `mentally handicapped`, `differently abled`,
`special needs`, `affected by`, `stricken with`, `suffers from`, `a victim
of`. Re-deriving exact per-row replacement targets from a table only
PARTIALLY re-quoted in the verification reports (verifier H's report
excerpts the errors it found, not a full re-transcription of every row)
risked reproducing the same crossed-row defect on a row nobody had
independently re-checked, so the remaining rows were excluded rather than
guessed at, per Rule 0's discipline. This was flagged in the original
final report as a known gap for a future pass to close.

#### Fix wave (task-10, 2026-07-29) — extended to the complete, independently re-verified 11-row table

`task-10-verify-accessibility.md` re-extracted the ENTIRE live table with
`BeautifulSoup(html5lib)`, reading each `<tr>`'s cells via
`find_all(["td","th"], recursive=False)` — one atomic tuple per row, never
three separately-collected column-wide lists zipped back together
afterward. That is exactly the shape that let the original research draft
cross two rows; reading a `<tr>` as one tuple makes it structurally
impossible here, regardless of which terms end up shipped. **Row count
correction**: the table has **11** rows, not the "ten rows" the original
Tier 2 design note (above) and `task-10-verify-H.md` described — Rows 8
and 10 both list "special needs" mapped to two DIFFERENT preferred
replacements ("person with cognitive disabilities, developmental
disabilities, learning disabilities, or dyslexia" for Row 8 vs. "functional
needs (or paraphrase according to the specific disability)" for Row 10) —
a genuine self-contradiction on Microsoft's own page. The original count
folded that duplicate into one logical entry instead of counting DOM rows
literally; both readings describe the same page content, and since
`special needs` ships as a single already-existing token either way (not
two separately-targeted rules), the miscount never affected what shipped.

All six previously-excluded named terms are now `CONFIRMED` on their own
distinct row, and eight further rows/terms were found that no earlier
pass had covered. `microsoft/accessibility-terms` is extended from 12 to
30 tokens, still 100% `pattern` (detection-only) — the extension adds
NO swap pairs and therefore carries none of the original crossed-row risk.
Per-row treatment, from the verified table:

- **Specific, low collision risk — shipped without extra guards:**
  `sight-impaired`, `vision-impaired` (Row 0), `hearing-impaired` (Row 1),
  `non-verbal` (Row 3), `maimed`, `missing a limb`, `birth defect` (Row 6),
  `Special Ed person` (Row 8), `normal person`/`healthy person` (Row 5,
  matched as the guide's own two-word PHRASE — see the technical-meaning
  collision note below), `Asperger's` (Row 9, matched with BOTH the
  verified straight U+0027 apostrophe and the curly U+2019 form, since a
  curly one would not match a straight-only pattern).
- **Needs a human, not a substitution — shipped anyway, since this is
  `pattern` and no substitution is ever offered:** `dumb`/`mute` (Row 3 —
  the row's own ONLY avoid-terms; no Acceptable-column alternative exists
  for this row at all), `lame` (Row 2), `stupid` (Row 8), `an epileptic`
  (Row 4 — the guide's own replacement is a condition-specific sentence
  rewrite, "has multiple sclerosis, cerebral palsy, a seizure disorder, or
  muscular dystrophy," not a term any `pattern`/`swap` rule can respell).

**Reversed decision: bare `lame` is no longer excluded.** The original
design excluded `lame` even from detection-only ("at least as common in
the unrelated idiom 'lame excuse'/'lame joke' as in any disability
reference, and Recheck has no way to distinguish the senses"). The fix
wave re-decided to ship it: since this rule is `pattern`-only, flagging
`lame` never risks an auto-rewrite of "lame excuse" — only a flag a human
can dismiss — and the same tolerance already applies to `stupid` (also
shipped, also a common general-purpose pejorative). `stupid` was not
previously excluded by name; it simply had not been added.

#### Technical-meaning collisions, scope-limited rather than shipped bare

- **`mute`** has an extremely common, entirely correct, unrelated
  technical sense as an audio/UI control ("mute the microphone," "mute
  notifications," a mute button/icon). A preset that rewrites "mute the
  audio track" would be worse than one that stays quiet — and even a bare
  `pattern` flag on every "mute" in a technical corpus would be mostly
  noise. Scoped instead to the shapes real ableist usage and the guide's
  own phrasing actually take: predicate-adjective position
  (`is`/`was`/`are`/`were`/`being`/`been` + `mute`) and the compound forms
  `deaf and mute`/`deaf-mute`. This deliberately does NOT match "mute the
  X," "on mute," or "mute button/icon/notifications" — the dominant
  audio-control phrasings — because none of those put "mute" in predicate
  position or in the disability-specific compound.
- **`normal`** (Row 5, as "normal person"/"healthy person") is matched as
  the guide's own two-word PHRASE, never the bare word. Bare `\bnormal\b`
  would also match a statistical "normal distribution" or "normalize a
  value" — senses the guide never addresses — while the phrase-level match
  is very unlikely to collide with either.
- **`dumb`** carries a secondary, weaker collision (a dated technical sense
  in "dumb terminal"/"dumb pipe") and the much more common "not smart"
  insult sense. Shipped bare anyway, on the same reasoning as `lame`/
  `stupid` above: this is detection-only, so the cost of an occasional
  false-positive flag is far lower than the cost of leaving a genuinely
  offensive, guide-confirmed term completely unflagged.
- **`an epileptic`** is guarded with a negative lookahead excluding
  `seizure`/`episode`/`fit`/`attack`/`event` immediately after — "an
  epileptic seizure" is ordinary, correct medical usage (an adjective
  describing the EVENT), not the guide's objection (calling a PERSON "an
  epileptic" instead of "a person with... a seizure disorder").
- **`non-verbal`** has a narrower, secondary technical sense too ("non-verbal
  communication," "non-verbal cues" in UX/behavioral-design writing) — a
  real but low-probability collision, accepted here per the "specific, low
  collision risk" classification above; unlike `mute`, it was not judged to
  need a scope guard.

### Known limitations

Verifier-confirmed guide-sanctioned exceptions or two-part tests the shipped
rules do not fully implement — recorded here, not just in each rule's
own comment, per the same discipline `recheck/google`'s provenance uses:

1. **`microsoft/alt-text-format` doesn't model the "if practical for the
   image type" carve-out** (verifier F, A3). Some alt text is legitimately
   a fragment that doesn't end in a period "if doing so is practical" —
   the shipped rule requires the period unconditionally.
2. **`microsoft/sign-in-sign-out`'s guide exception is a two-part test**
   (verifier F, U7): "unless it appears in the UI" AND "you're writing
   instructions" — both conditions are required, but Recheck has no way to
   know whether a matched string is a literal UI label being quoted.
3. **`microsoft/no-space-around-em-dash` doesn't distinguish contexts for
   en dashes at all** — deliberately: the guide's spaced-en-dash exception
   for UI timestamps is common enough, and structurally indistinguishable
   from the ordinary prohibited case, that this preset does not attempt to
   enforce en-dash spacing in either direction. See the self-contradictions
   section.
4. **`microsoft/accessibility-terms` still doesn't offer any replacement
   text (it's `pattern`, not `swap`), even after the task-10 fix wave
   extended it to the complete, re-verified 11-row table** — a deliberate
   choice, not a residual gap: no wrong-target pairing is possible only
   because no target is ever prescribed. A reader wanting the specific
   replacement for a flagged term should consult "Tier 2 design" above or
   the live `accessibility-terms` page directly.
5. **No rule enforces C21 (first-mention acronym expansion).** The
   research draft's `conditional`-based approach (`microsoft/expand-sso`,
   one rule per acronym) needs a project-specific list of acronym/expansion
   pairs the guide itself doesn't provide, and the live page carries three
   documented carve-outs (don't introduce a parenthetical for a single-use
   acronym; some acronyms like USB/FAQ/URL should never be spelled out at
   all; avoid first use in a heading/title unless needed for SEO) that the
   draft's rule shape ignores entirely. `conditional` remains a documented
   opt-in (`DOCUMENTED_OPT_IN_ASSERTIONS`), unchanged from before this task.

### Author's judgment calls

Decisions this preset's author made that go beyond a verifier's literal
verdict, recorded per the task's instruction to flag (not silently
resolve) anything not settled by the inputs:

1. **`master/slave` — originally shipped in NEITHER direction per the
   brief's literal Step 3 instruction, then ESCALATED to detection-only in
   the task-10 fix wave (2026-07-29) after the project owner's review.**
   The original judgment call (flagging the tension between the brief's
   literal wording and verifier E's softer resolution note) was confirmed
   correct to raise; the settled decision is `microsoft/master-slave` as a
   `pattern` rule naming both candidate replacements — see the
   "Self-contradictions" section's dedicated subsection above for the full
   reasoning.
2. **Several additional Tier-1 entries excluded on audience-collision
   grounds beyond the ten the corrections doc named** (`deprecated`,
   `user`, `client`, `utility`, `cursor`, `machine`, `start`, `and/or`,
   `freeze`/`frozen`) — see "Additional tier-boundary findings" and
   "TOO-RISKY" above. Each is defensible individually, but collectively
   this is a broader exclusion than the corrections doc's own five-plus-
   five enumeration, reflecting Redocly's specific developer-documentation
   audience.
3. **`paragraph-length` ships with only `max: 7`, dropping the guide's
   `min: 3`** — an empirical finding from building this preset's own clean
   fixture, not a verifier's instruction. See the "No `metric` rule"
   section's deviation note.
4. **Tier 2 (`microsoft/accessibility-terms`) ships as `pattern`
   (detection-only), not `swap`** — a stricter design choice than the
   draft's swap-based approach, made specifically to make the crossed-row
   defect class structurally impossible rather than merely fixed for the
   three rows verifier H happened to catch. Extended in the task-10 fix
   wave (2026-07-29) from 12 to 30 tokens (11 rows, complete) per
   `task-10-verify-accessibility.md`'s bounded, atomic-per-`<tr>`
   re-extraction — still entirely `pattern`, so the extension carries none
   of the crossed-row risk the original design was built to avoid. See
   "Tier 2 design" above for the per-term treatment and the two
   technical-meaning collisions (`mute`, `normal`) scoped rather than
   shipped bare.
5. **`microsoft/actionable` and the VERB-ABLE/CASE-ONLY buckets use
   "rewrite" language in their messages, not "replace"** — matching
   `recheck/google`'s own established convention for the same fix-safety
   classes.
6. **No `microsoft/proper-names` rule ships**, matching `recheck/google`'s
   own precedent of leaving brand/product vocabulary to the user's config.
7. **The broader militaristic-language word bundle and C20's illustrative
   phrase pairs are excluded** even though the underlying principle is
   CONFIRMED, because no verifier independently quoted exact replacement
   text for the specific multi-word examples — see the relevant sections
   above.

### Engine/registry changes this preset required

- **`occurrence` moved from `DOCUMENTED_OPT_IN_ASSERTIONS` to "shipped in a
  preset"**, the same way `length` moved when `recheck/google` shipped it.
  `microsoft/comma-density` gives it a real, guide-sourced default
  (`max: 2`), so its bounds are no longer "no one right answer for
  everyone." `conditional` and `metric` remain opt-in — see "Known
  limitations" #5 and the "No `metric` rule" section for why neither ships
  here either.
- **`recheck/microsoft` registered in `src/config/presets/index.ts`** and
  added to the six-preset list `presets.test.ts` pins.
- **README.md's preset list and "Opt-in prose assertions" section updated**
  to describe the new preset and reflect `occurrence`'s move out of the
  opt-in list (mirroring how `length`'s move was documented for
  `recheck/google`).
- No `schema.ts` or `case-preserve.ts` changes were needed: Task 9 already
  widened the rule-key pattern to `^[a-z][a-z0-9-]*/[a-z0-9-_]+$` and fixed
  `applyMatchCase`'s multi-word-replacement shouting bug before this task
  began (see `task-10-resolutions.md`'s Constraints 1 and 3) — both were
  verified against the LIVE code, not assumed, before authoring any rule
  here (see the final report's "Constraint verification" section).

### Fix wave (2026-07-29)

Base commit `8d7b32cb506`, branch `aa/recheck-style-guides`. Three items
from the fix brief (`.superpowers/sdd/task-10-fix-brief.md`):

1. **`master/slave` escalated from "ships in neither direction" to
   detection-only.** New rule `microsoft/master-slave` (`pattern`, no
   `swap`) — see the "Self-contradictions" section's dedicated
   subsection and the "Bias-free, militaristic, derogatory language"
   table row.
2. **`microsoft/accessibility-terms` extended from 12 to 30 tokens** —
   the complete, independently re-verified 11-row table from
   `task-10-verify-accessibility.md` (a bounded, atomic-per-`<tr>`
   re-extraction that supersedes `task-10-verify-H.md`'s partial one for
   this rule). Row-count correction (10 → 11) and per-term treatment are
   in "Tier 2 design" above. Still 100% `pattern` — no swap pairs were
   added, so the extension carries none of the crossed-row risk the
   original detection-only design exists to avoid. Two technical-meaning
   collisions (`mute`, `normal`) were scoped rather than shipped bare;
   `an epileptic` is guarded against the legitimate "epileptic
   seizure/episode/fit/attack/event" medical phrasing; bare `lame` (fully
   excluded before this wave, even from detection-only) and `stupid`
   ship, accepting their ordinary-usage collision on the same reasoning
   the rule already applied to other pattern-only entries.
3. **`microsoft/paragraph-length`'s `min: 3` deviation** — re-checked
   against the fix brief's Item 3 and found ALREADY fully documented (the
   "No `metric` rule" section's "Two deliberate deviations" note and
   "Author's judgment calls" #3, both present before this wave): the
   empirical reason (a dozen ordinary short paragraphs over-firing) and
   the source URL (scannable-content) were already recorded. No edit was
   needed for this item; noted here so the fix wave's own scope is
   auditable.

Plus two documentation carry-overs from `recheck/google` (Item 4, touching
files outside this preset — not duplicated here, see those files
directly):

- `presets/google/PROVENANCE.md`'s "Known limitations" section gained a
  third entry noting `google/gcp-name` is case-sensitive (no
  `ignoreCase`), so `gcp`/`Gcp` are neither flagged nor fixed.
- `src/core/case-preserve.ts`'s `applyMatchCase` doc comment gained a
  "KNOWN EDGE" paragraph naming the hyphen/dot-only "multi-word" gap
  (`ECOMMERCE` → `E-COMMERCE`, `NODEJS` → `NODE.JS`) — comment only, no
  behavior change; the behavior is under separate review approval.

Verification: `pnpm build` (dist re-emitted after deleting
`tsconfig.tsbuildinfo`/`tsconfig.typecheck.tsbuildinfo`), `pnpm test`,
`pnpm parity` (27425 = 27425, unchanged), `npx nx run recheck:lint
--max-warnings=0`, plus both preset acceptance gates (every rule and pair
fires on the violations fixture; the clean fixture reports zero, extended
with near-misses for a legitimate audio "mute" and a statistical "normal
distribution") — see `.superpowers/sdd/task-10-report.md`'s "## Fix wave"
section for the full command output.

### Fix wave B (2026-07-30)

Base commit `e629b0f141f`, branch `aa/recheck-style-guides`. Fix brief:
`.superpowers/sdd/task-10-fixB-brief.md`. An independent review found the
same defect class that took `recheck/google` three fix waves: the clean
fixture and per-token gate had no A–Z Tier-1 near-miss coverage, so ~15
Tier-1 pairs corrupted correct prose (and `us-spelling` collapsed
inflections onto a single literal replacement) behind an all-green suite.

#### Step 1 — clean fixture extended with A–Z Tier-1 near-misses

`microsoft-clean.md` gained an "Avoid-term near-misses" section covering
all 13 minimum-named phrases plus a 14th (`hangs on to`, the phrasal-verb
collision Step 4 also names). Before any Step 3/4 fix, this section alone
produced 14 false-positive findings — every one of the corrupting pairs
below, confirming the gate is real (see the report for the exact list).

#### Step 2 — per-token gate inverted to derive from the live preset

`preset-microsoft.test.ts`'s pattern-token coverage test used to iterate
`Object.entries(PATTERN_TOKEN_EXAMPLES)` — the map's own keys — so a
`pattern` rule with no entry in the map was invisible to it. It now
iterates `Object.entries(preset)` and requires every rule with a `pattern`
assertion to have a registered entry, the same inversion Task 10's
original fix wave applied to the per-pair gate. Before this fix wave, the
map covered 2 of 24 `pattern` rules (32 of 67 tokens); it now covers all of
them (67 tokens pre-wave, growing to more as Step 4 moved some `swap` pairs
to detection-only `pattern` siblings — see the report for the final
count).

#### Step 3 — `us-spelling` inflection collapse fixed

Every alternation-group key (`(s)?`, `(ed|ing)`, `(e|es|ed|ing|ation)`) was
split into one literal pair per inflection — `centre`/`centres`,
`cancelled`/`cancelling`, `authoris(e/es/ed/ing/ation)`,
`customis(e/es/ed/ing/ation)`, `labelled`/`labelling`,
`modelled`/`modelling` — each mapped to its own correct US-spelling target
(`canceling`, not just `canceled`, for the `-ing` form; matches G:174/G:175,
which the previous single-target replacement contradicted for both
`cancelling`→`canceling` and `labelling`→`labeling`). `favou?rite` (not an
alternation group, but the same class of bug: the optional `u` matched the
already-correct `favorite` spelling too) narrowed to `favourite` only.
`dialogue box` removed from this rule (see Step 7 — it already ships in
`microsoft/dialog-terminology`).

#### Step 4 — ~15 Tier-1 pairs no longer rewrite correct prose

| Pair                                                  | Disposition                                              | Reasoning                                                                                                                                                                                                      |
| ----------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SMB` → `small or medium-sized business`              | **Dropped**                                              | Homograph with the Server Message Block protocol, common in exactly Redocly's domain ("mount the SMB share"); no positional anchor distinguishes the senses.                                                   |
| `SKU` → `edition`                                     | **Dropped**                                              | `SKU` is standard e-commerce/inventory vocabulary in API docs; also carried an independent ALL-CAPS-shout hazard (single-word replacement) and a multi-target guide quote (subscription/edition/version/tier). |
| `terminate` → `close`                                 | **Dropped**                                              | "Terminate the instance/process/session" is standard, correct cloud-infrastructure vocabulary in Redocly's own domain — a genuine meaning change, not a false match, with no reliable anchor.                  |
| `exit` → `close`                                      | **Anchored, stays fixable**                              | Lookaround excludes preceding "the/an/no/emergency" and following "code/status/button/sign/strategy/interview/poll/ramp/velocity/row" (noun-compound senses).                                                  |
| `launch` → `open`                                     | **Anchored, stays fixable**                              | Excludes preceding "product/software/game/website/app/feature/rocket/mission" and following "date/event/party/window/site/pad/day/plan/schedule/announcement".                                                 |
| `boot` → `turn on`                                    | **Anchored, stays fixable**                              | Excludes following "disk/sector/loader/sequence/process/time/options/record/partition/menu/order/camera".                                                                                                      |
| `crash` → `fail`                                      | **Moved to detection-only** (`az-state-failure-detect`)  | G:73 gives a hardware/software target split ("fail" vs. "stop responding") a single `swap` replacement can't express; also anchored against "crash dump/report/log/course/test/site".                          |
| `lock up` → `fail`                                    | **Moved to detection-only** (`az-state-failure-detect`)  | Same hardware/software split (G:77).                                                                                                                                                                           |
| `hangs`/`hang` → `stops responding`/`stop responding` | **Anchored, stays fixable**                              | Excludes "hang(s) on/up/around/out/together" (retain, end a call, loiter — unrelated phrasal verbs).                                                                                                           |
| `roman` → `regular type`                              | **Anchored, stays fixable**                              | Excludes the civilization/proper-noun sense ("Roman numerals/Empire/alphabet/calendar/..."), a homograph collision of the `aka`-inside-`Akamai` shape.                                                         |
| `italics`/`italicized` → `italic`                     | **Moved to detection-only** (`microsoft/italic-as-noun`) | The guide's own rule ("use only as an adjective, not a noun") makes a direct swap ungrammatical in exactly the position the avoid-term occupies — the same class as `actionable`.                              |
| `blade` → `pane`                                      | **Anchored, stays fixable**                              | Excludes following "server(s)/enclosure/chassis/center(s)/centre(s)" (physical hardware sense).                                                                                                                |
| `beta` → `preview`                                    | **Anchored, stays fixable**                              | Excludes following "distribution/function/coefficient/particle/blocker/decay" (statistical/physics/medical senses).                                                                                            |
| `visit` → `go to`                                     | **Anchored, stays fixable**                              | Excludes following "count(s)/duration/frequency/history/log/data" (analytics-metric noun sense).                                                                                                               |
| `in addition` → `also`                                | **Anchored, stays fixable**                              | Excludes following "to" (the standard, grammatically necessary preposition phrase "in addition to X", distinct from the guide's stand-alone-adverb target).                                                    |
| `print out` → `print`                                 | **Anchored, stays fixable**                              | Excludes following "of" (noun sense — "a print out of X" — distinct from the guide's verb-scoped rule).                                                                                                        |

#### Step 5 — the "CONFIRMED unconditional" comment corrected

The A-Z word list section's header comment claimed every pair was
"CONFIRMED unconditional by at least one verifier." Fifteen pairs
contradicted it; each was moved to a `*-detect` `pattern` sibling,
`fix: false`, or dropped (`terminate`, covered under Step 4):

- **Moved to detection-only:** `quit`/`deinstall`/`reinitialize`
  (`az-lifecycle-verbs-detect`; G:88 multi-target, G:156/H:52 "(cond.)"),
  `crash`/`lock up` (`az-state-failure-detect`; Step 4), `bottom
left`/`bottom right` (`az-direction-layout-detect`; G:106, the
  BottomLeft/BottomRight API-property carve-out), `thank you`
  (`az-geography-detect`; H:62), `hierarchical menu`/`secondary
menu`/`running head`/`running foot` (`az-ui-nouns-detect`; G:146/H:93),
  `pound sign` (`az-abbreviations-names-detect`; H:115).
- **`fix: false`:** `left-hand`/`right-hand` (new rule
  `microsoft/left-hand-right-hand`; G:108 marks these DETECT-ONLY outright
  — no replacement is stated on the live page for the modifier sense, so
  shipping one fixable was itself the defect).
- **Already detection-only, no change needed:** `backbone`/`natural user
interface` (G:187/G:190) already ship as `pattern` in
  `microsoft/az-no-replacement`. `indices` is excluded entirely (see Step
  5's own TOO-RISKY note below), so its math-carve-out marker (G:168) never
  reached a shipped pair either.

Every OTHER pair in the A-Z word list remains CONFIRMED unconditional by at
least one verifier, and the section header comment now says so precisely
instead of unconditionally.

#### Step 6 — provenance defects (links, sources.json)

1. **17 of 82 `link:` fields 404'd.** Every rule that cited bare `AZ_BASE`
   (16 rules pre-wave, more after Step 4/5 added new rules) now cites the
   real, live, term-specific page for one of its pairs (verified via
   `curl`, HTTP 200, for every one — see the table below). `microsoft/
mouse-over`'s slug carried a spurious "-and-"
   (`mouse-and-mouse-interaction-terms`, 404) corrected to
   `mouse-mouse-interaction-terms` (200) — verifier G's own fetch log
   named the correct slug at G:200; the verifier never cited the broken
   form itself.

   | Rule                            | New link slug                  |
   | ------------------------------- | ------------------------------ |
   | `spelling-hyphenation`          | `e/email`                      |
   | `az-case-only`                  | `i/internet-intranet-extranet` |
   | `az-verb-able`                  | `b/blacklist`                  |
   | `az-state-failure`              | `h/hang`                       |
   | `az-state-failure-detect`       | `c/crash`                      |
   | `az-lifecycle-verbs`            | `b/boot`                       |
   | `az-lifecycle-verbs-detect`     | `q/quit`                       |
   | `az-judgment-words`             | `f/finalize`                   |
   | `az-geography`                  | `f/far-east`                   |
   | `az-geography-detect`           | `t/thanks-thank-you`           |
   | `az-direction-layout`           | `f/far-left-far-right`         |
   | `az-direction-layout-detect`    | `b/bottom-left-bottom-right`   |
   | `left-hand-right-hand`          | `l/left-leftmost-left-hand`    |
   | `az-ui-nouns`                   | `b/blade`                      |
   | `az-ui-nouns-detect`            | `h/hierarchical-menu`          |
   | `az-typography`                 | `r/roman`                      |
   | `az-filesystem`                 | `c/child-folder`               |
   | `az-grammar-usage`              | `a/as-well-as`                 |
   | `az-abbreviations-names`        | `h/hexadecimal`                |
   | `az-abbreviations-names-detect` | `n/number-sign`                |
   | `az-navigation`                 | `v/visit`                      |
   | `bookmark-favorite`             | `b/bookmark`                   |
   | `az-no-replacement`             | `b/black-box`                  |
   | `az-real-replacements`          | `f/friendly-name`              |

   All 60 distinct URLs this preset's rules now cite were verified live
   (`curl -A "Mozilla/5.0..."`) at HTTP 200 as of 2026-07-30.

2. **Two `sources.json` entries hashed Microsoft's 404 page.** The bare
   `a-z-word-list-term-collections/` index and the broken `mouse-and-mouse`
   slug both hashed `bytes: 1898` / `sha256: 0ea4f717...` — the same 404
   page. Both entries are gone from `sources.json` (no rule links to the
   bare index anymore; the mouse-over rule now links to the corrected,
   working slug, hashed at its real content: 24140 bytes). An `httpStatus`
   field was added to every entry so a dead URL is visible at a glance
   instead of only discoverable by noticing two entries collide.
   `sources.json` now hashes 60 pages (was 35), all `httpStatus: 200`, all
   independently reproducible (fetched twice, byte-identical both times).
3. **`## Excluded candidates` now carries URLs.** The TOO-RISKY table's 18
   rows each gained a "Source(s)" column with the live, verified page(s)
   backing that exclusion — see the table itself, above.

#### Step 7 — double-reporting spans resolved

- `labelled`/`labelling` used to fire both `us-spelling` ("labeled"/
  "labeling", now correct per Step 3) and `az-grammar-usage` ("labeled"/
  "labeling") — removed from `az-grammar-usage`, matching the precedent
  that rule's own comment already documented for `multi-factor`.
- `dialogue box` used to fire both `us-spelling` and `dialog-terminology`
  (same target, "dialog", in both) — removed from `us-spelling` (Step 3);
  `dialog-terminology` is the more specific, complete owner (it already
  bundles `dialog box`/`pop-up window` in the same rule).

#### Step 8 — `client`/`utility`/`start` given a real disposition, not just candor

All three remain excluded (unchanged from before this wave), but the
PROVENANCE note is now a considered "anchoring was evaluated and rejected"
call, not an open inference aside — see "Additional tier-boundary
findings" above for the per-term reasoning (each fails for a different,
specific reason: `client`/`utility` have no positional anchor separating
the person/vague sense from the dominant technical one; `start` is too
polysemous for any anchor to meaningfully narrow).

#### Step 9 — accuracy fixes

- `case-preserve.ts`'s "KNOWN EDGE" note claimed no shipped pair hit the
  hyphen/dot-joined-replacement shouting gap — false; `spelling-
hyphenation`'s `ecommerce`→`e-commerce`/`elearning`→`e-learning`/
  `ebook`→`e-book` all do (comment corrected, no behavior change).
- `az-case-only`'s claim that all 17 pairs would "silently no-op" was
  verified against the live `applyMatchCase` function directly (not
  re-reasoned by eye): true for only 7 (`Internet`, `Intranet`,
  `Extranet`, `Euro`, `WWW`, `Registry`, `Spam`). The other 10 (`Big
Data`, `Dark Mode`, `darkmode`, `Devops`, `devops`, `bluetooth`,
  `boolean`, `Javascript`, `javascript`, `World Wide Web`) now ship
  fixable in a new rule, `microsoft/az-case-fixable`, instead of
  reporting forever for no reason.
- `bookmark`→`favorite` moved to `fix: false` (new rule
  `microsoft/bookmark-favorite`) — resolutions C4 names it VERB-ABLE.
- `all right` added to the `okay`/`alright`→`OK` pair (H:120 names three
  terms; only two shipped).
- `freeze`/`frozen`'s exclusion note corrected — it previously said "not
  verifier-flagged"; G:76 marks it `CONFIRMED (cond.)`. The exclusion
  itself was already correct; only the note's claim about its sourcing
  was wrong.

#### Gates — command and output

See `.superpowers/sdd/task-10-report.md`'s "## Fix wave B" section for the
full command output (`pnpm build`, `pnpm test`, `pnpm parity` — unchanged
at 27425 = 27425 — `npx nx run recheck:lint --max-warnings=0`) and the four
acceptance-gate results (every Step 3/4 string fixed twice without
corruption; the nine collision probes still clean; every rule/pair/token
firing; the clean fixture, extended with the new near-misses, reports
zero).

### Fix wave C (2026-07-30)

Base commit `b29fa202046`, branch `aa/recheck-style-guides`. Fix brief:
`.superpowers/sdd/task-10-fixC-brief.md`. A reviewer probed four pairs in
one rule family nobody had named (`az-grammar-usage`) and found two more
corrupting pairs — both marked plain `CONFIRMED` by a verifier, with the
correct quote attached:

- `as well as` → `and`: a/as-well-as says _"Don't use as a synonym for
  and"_ — a caution against treating the two as interchangeable, not an
  instruction to replace the text.
- `or greater`/`or higher`/`or lower` → `or later`/`or earlier`:
  g/greater-better and h/higher scope this to _"identifying multiple
  versions of programs or apps"_ — a version-number rule, not a
  general-magnitude rule.

#### The root cause, restated precisely

A `CONFIRMED` verdict means _the live page genuinely discusses this term_.
It does **not** mean _a blind textual substitution of that term is safe_.
Those are two different properties, and this task's verification passes
(E/F/G/H/accessibility) only ever checked the first one. Fixing the two
named pairs without addressing the conflation would have left the rest of
the class shipped, so Step 1 was an audit of **every** fixable pair against
the substitution question, not a two-line patch.

#### Step 1 — full audit of every fixable pair

**230 fixable pairs audited** (225 `swap` pairs across 40 rules with `fix`
not set to `false`, plus 5 `consistency` `either` pairs — the complete set
`Object.keys(preset)` produces when filtered to fixable `swap`/`consistency`
assertions). Method: re-read each pair's verifier-row quote in
`task-10-verify-{E,F,G,H}.md`; where the quote was ambiguous as to shape
(narrower scope, multi-target, or a caution-vs-instruction distinction), the
live page was re-fetched with `curl` + a local `html5lib`/BeautifulSoup
parse (never inferred from the row alone) — 29 pages re-fetched this wave,
all HTTP 200.

**10 pairs reclassified** from fixable to detection-only or `fix: false`:

| Pair                                                       | Rule (before → after)                                                  | Guidance shape (live quote)                                                                                                                                                                                    | Why unsafe as a blind swap                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as well as` → `and`                                       | `az-grammar-usage` → `az-grammar-usage-detect` (`pattern`)             | "Don't use **as a synonym for** and."                                                                                                                                                                          | Caution against conflation, not an instruction to replace — "As well as being fast, the API is reliable." → "And being fast, the API is reliable." is not grammatical; "and" can't head a sentence the way a subordinating phrase can.                                                                                                                                                                                           |
| `or greater` → `or later`                                  | `az-grammar-usage` → `az-grammar-usage-detect`                         | "Don't use greater or better to mean or later **when identifying multiple versions of programs or apps**."                                                                                                     | Scoped to version numbers; "a score of 80 or greater" → "a score of 80 or later" is nonsensical for a magnitude.                                                                                                                                                                                                                                                                                                                 |
| `or higher` → `or later`                                   | `az-grammar-usage` → `az-grammar-usage-detect`                         | Same page, PLUS: "It's OK to use higher to refer to **display resolution**. Don't use higher to refer to **processor speed**. Use **faster** instead."                                                         | Scoped to version numbers AND multi-target (resolution: unchanged; processor speed: "faster"; version: "later") — no single literal replacement covers all three senses the live page itself names.                                                                                                                                                                                                                              |
| `or lower` → `or earlier`                                  | `az-grammar-usage` → `az-grammar-usage-detect`                         | "Don't use **to indicate product version numbers**. Use earlier instead."                                                                                                                                      | Same version-number scoping; "lower" is an ordinary magnitude word (price, temperature, priority) in every other context.                                                                                                                                                                                                                                                                                                        |
| `leverage`/`leveraging`/`leveraged` → `use`/`using`/`used` | `microsoft/leverage`, `fix: false`                                     | "Don't use **as a verb** to mean take advantage of. Use take advantage of, use, or **another more appropriate word or phrase**."                                                                               | Verb-sense-scoped AND multiple-alternatives. "Leverage"/"leveraged" are also common, correct nouns/adjectives this page never addresses ("financial leverage", "a highly leveraged company", "a leveraged buyout") — unlike `impact-verb`, there's no small enumerable set of following objects to anchor on (leverage takes almost any direct object), so detection-only is the fallback, not an abandoned first attempt.       |
| `glyph` → `symbol`                                         | `microsoft/glyph`, `fix: false`                                        | "Don't use to refer generically to a graphic... on a button, on an icon, or in a message box. Use symbol instead. **It's OK to use glyph in a technical discussion of fonts and characters.**"                 | Context-scoped exactly like the developer-audience carve-outs already excluded for `header`/`disk`/`directory`/`context menu` — font/Unicode documentation (plausible in Redocly's own docs) uses "glyph" as a precise technical term this page's objection doesn't cover, and no anchor tells "technical discussion of fonts" apart from the generic-icon sense.                                                                |
| `de facto` → `in practice`                                 | `no-latin-abbreviations` → `no-latin-abbreviations-detect` (`pattern`) | use-us-spelling's ONLY sentence: "Avoid non-English words or phrases, **such as** de facto or ad hoc."                                                                                                         | No replacement given at all — an example list of avoid-terms, not a "use Y instead of X" table row (unlike `e.g./i.e./viz./ergo`, which come from this same page's own table). "in practice" was the author's own reasonable-sounding guess.                                                                                                                                                                                     |
| `ad hoc` → `as needed`                                     | `no-latin-abbreviations` → `no-latin-abbreviations-detect`             | Same sentence as `de facto`.                                                                                                                                                                                   | Same — no replacement stated.                                                                                                                                                                                                                                                                                                                                                                                                    |
| `vis-a-vis` → `compared with`                              | `no-latin-abbreviations` → `no-latin-abbreviations-detect`             | **Not named on any fetched page at all** — confirmed via a live 404 on `v/vis-a-vis`.                                                                                                                          | Not just "no replacement given" — the term itself isn't sourced anywhere; "compared with" is entirely the author's own invention.                                                                                                                                                                                                                                                                                                |
| `visit` → `go to`                                          | `az-navigation` → `az-navigation-detect` (`pattern`)                   | "use go to in **most cases**... It's OK to use visit... if you're using a tone that's meant to imply [a suggestion, or browsing]." Worked example: "**Visit** the product website to learn about offerings..." | The live page's own approved example uses "visit" — a blind fix would rewrite Microsoft's own sanctioned usage. Also a second, independent hazard the wave-B anchor never covered: "visit" preceded by an article ("Schedule a visit", "during my visit") is a common noun sense the noun-**compound** anchor (which only excluded specific FOLLOWING words) never excluded — "Schedule a go to with the doctor" is not English. |

`hot link` (same `az-navigation` rule) and `e.g./i.e./viz./ergo` (same
`no-latin-abbreviations` rule) were audited alongside their reclassified
siblings and are unconditional, single-target, direct substitutions per
their own live pages — they stay fixable.

#### Anchor gaps found and closed (not reclassifications — same bucket, wider anchor)

Auditing the pairs wave B already anchored surfaced three anchors that were
real but incomplete — the guidance shape was correctly identified as
sense-scoped, but the exclusion list didn't cover every common noun/idiom
sense:

| Pair                                  | Rule                   | Gap found                                                                                                                                                                                                                                                                                                              | Fix                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hang`/`hangs` → `stop(s) responding` | `az-state-failure`     | Exclusion list (`on/up/around/out/together`) missed "get the hang **of** it" (a knack, not a system), "hang **in** there"/"hang **tight**"/"hang **loose**"/"hang **fire**" (encouragement/waiting idioms), and the literal suspension sense ("hangs **from** the ceiling"/"hangs **over** the door").                 | Added `of/in/tight/loose/fire/from/over` to the exclusion list. Not exhaustive — "hang" is as broad a word as `crash`/`lock up`, which were moved to detection-only in wave B for the identical breadth reason — but this closes the specific gap a plausible Redocly onboarding sentence ("Once you get the hang of the API...") would have hit.                                                                         |
| `print out` → `print`                 | `az-real-replacements` | The noun-compound anchor only excluded "print out **of** X" — "Keep the print out safe"/"Attach the print out to the ticket" (a determiner-preceded noun, no "of" following) still corrupted to "Keep the print safe"/"Attach the print to the ticket" (register shift toward "print" = photograph).                   | Added a negative lookbehind excluding a preceding determiner/possessive (`a/an/the/this/that/your/my/its/his/her/their/our`) — the verb sense is never preceded by a determiner directly.                                                                                                                                                                                                                                 |
| `click`/`clicks` → `select(s)`        | `no-click`             | The live page's ban is verb-scoped ("Avoid this **verb**"); the anchor excluded hyphen-joined compounds and letter-adjacent compounds (`double-click`, `clickstream`) but not the ordinary noun sense ("click count", "clicks per session") — plausible in analytics/UI-event documentation, exactly Redocly's domain. | Added a follow-word exclusion for noun-compound risk (`count(s)/rate(s)/event(s)/tracking/data/metrics/history/id(s)/per`). Residual, accepted risk (not anchored): the live page's own carve-out "OK to use click when you need to describe mouse actions specifically" isn't mechanically detectable — same class as `hex`'s mechanical-fastener sense, low practical likelihood in Redocly's API-documentation domain. |

#### Bug fix found during the audit (not a substitution-safety issue — a detection bug)

`microsoft/article-before-acronym` shipped `'a SQL': 'a SQL'` — a
same-to-same self-mapping, not a wrong→right correction like its three
sibling pairs (`'an URL': 'a URL'`, `'a ISP': 'an ISP'`, `'an SQL database':
'a SQL database'`). Because `swap`'s `execute()` reports every regex match
as a violation regardless of whether match equals replacement, this flagged
the ALREADY-CORRECT "a SQL" (e.g. "Write a SQL query") as if it were wrong,
and `--fix` reproduced identical text — a permanent, silent false-positive
DETECTION on correct prose (not a corruption, but squarely inside this
audit's "every fixable pair" scope). Corrected to `'an SQL': 'a SQL'`,
mirroring the `'an SQL database'` pair's own pronunciation rule for the bare acronym
without a following noun.

#### Step 2 — near-miss coverage extended

`microsoft-clean.md` had no near-miss at all for `az-grammar-usage` — the
gap this wave's two named defects came from. A new "Fix wave C
near-misses" section adds the `hang`/`print out`/`click`/SQL anchor-gap
near-misses (the ones that remain FIXABLE, so a zero-findings clean-fixture
check is meaningful for them). The 10 reclassified pairs above are
DETECTION-only or `fix: false` — by construction they flag every occurrence
including a compliant one (that's what detection-only means: a human
reviews it instead of the tool guessing), so a zero-findings clean-fixture
entry for them would be structurally impossible, not a gap. Their
protection instead lives in `preset-microsoft.test.ts`'s new "fix wave C"
`describe` blocks: an `unchanged` list (fixed twice, byte-identical) proving
no corruption, and a `stillDetects` list (per acceptance item 3) proving the
rule still reports the violation rather than going silently dead.

#### Step 3 — `SMB`/`SKU`/`terminate` added to the canonical registry

All three were genuinely absent from every rule (correctly dropped in fix
wave B) but existed only in that wave's narrative "Fix wave B / Step 4"
table above, which has no URL column. Added to "Excluded candidates" —
the table whose stated purpose is answering "why doesn't
`recheck/microsoft` check X?" — with rule, live URL, and reason, matching
the format already used for the 18 pre-existing TOO-RISKY rows. See that
table for the three new rows.

#### Step 4 — `centred`/`centring` and `catalogued`/`cataloguing` added

`us-spelling` covered `centre`/`centres` and `catalogue`/`catalogues` (the
noun/plural forms) but not the verb inflections. Not a regression — the
original alternation groups fix wave B / Step 3 replaced never covered
these verb forms either — but "enumerate every inflection" is the standard
Step 3 established, so this finishes it: `centred`→`centered`,
`centring`→`centering`, `catalogued`→`cataloged`, `cataloguing`→`cataloging`.

#### Step 5 — the CONFIRMED-vs-safe-to-fix distinction, written down for reuse

Recorded here and mirrored in `presets/google/PROVENANCE.md`: a verifier
`CONFIRMED` verdict establishes only that the live guide page discusses a
term. It does **not** establish that a blind textual (`swap`) substitution
of that term is safe — that is a separate question, requiring the same
per-pair check Step 1's table above applies (direct instruction vs.
synonym-conflation caution vs. verb/context-scoped vs. multi-target vs. no
replacement given). Two future presets will be authored against these same
verifier reports; this distinction, not any single fixed pair, is the most
transferable thing this task has produced.

**Superseded by the posture change below.** This distinction turned out to
be necessary but not sufficient: fix waves A/B/C each fixed the specific
pairs a probe happened to find (2, then 2, then 6), and each probe found
more. See "Fix-posture change" for why CONFIRMED-vs-safe-to-fix was
replaced with a second, orthogonal axis and a structural (not reactive)
posture.

#### Gates — command and output

See `.superpowers/sdd/task-10-report.md`'s "## Fix wave C" section for the
full command output (`pnpm build`, `pnpm test`, `pnpm parity` — unchanged at
27425 = 27425 — `npx nx run recheck:lint --max-warnings=0`) and the four
acceptance-gate results (all 10 reclassified pairs plus the two named
corruptions fixed twice, unchanged; the 20 wave-B corruption strings still
clean; every retained/anchored pair still catches its genuine violation;
every rule/pair/token still firing, clean fixture zero with the new
near-misses).

### Fix-posture change (2026-07-30)

> **RETIRED 2026-07-30 — see "Detection-only" at the end of this file.**
> This section's criterion (same-word normalization) no longer determines
> which pairs are fixable in this preset: none are. Kept as historical
> record only.

Base commit `eb4f8b11dac`, branch `aa/recheck-style-guides`. Brief:
`.superpowers/sdd/preset-fix-posture-brief.md`. Report:
`.superpowers/sdd/preset-fix-posture-report.md`.

#### Why fix waves A/B/C never converged

Three fix waves on this preset each fixed the NAMED corrupting pairs an
independent probe found, and each probe found more (2, then 2, then 6).
Step 5 above ("CONFIRMED means discussed, not safe-to-fix") explained WHY
each individual pair was missed, but it did not stop the next probe from
finding another one, because it is still a per-pair judgement call —
exactly the kind of call that is easy to get right nine times and wrong
the tenth. The last probe's six findings, all reproducible and stably
wrong under `--fix` twice:

```
"Tensions remain high near the DMZ dividing North and South Korea."
   -> "...near the perimeter network dividing North and South Korea."
"Traders watched the ask tick higher throughout the session."
   -> "Traders watched the request tick higher throughout the session."
"...so the CLI can find the user's home directory for its config files."
   -> "...find the user's root directory..."          (semantically wrong)
"Use the API to unmark a conversation as read..."
   -> "Use the API to clear a conversation as read..."
"The contractor built the connector on spec..."
   -> "...built the connector on specification..."
"The click-through rate improved after the redesign."
   -> "The select-through rate improved after the redesign."
```

#### The two orthogonal axes, and the posture that makes both moot for fixing

1. **Guidance-shape axis** (Step 5 above): does the guide's own wording
   authorize a direct substitution, or is it a caution / scoped / multi-
   alternative / no-replacement statement?
2. **Homograph axis** (new this wave): does the avoid-term have a
   legitimate, unrelated sense in ordinary or technical English? All six
   corruption strings above pass axis 1 (each guide page states a plain
   "use Y instead of X" rule) and fail on axis 2 — `DMZ` is also the
   Korean border zone; `the ask` is also the bid/ask market term; `home
directory` always means the Unix `$HOME` sense in the corrupted
   sentence, and the guide's "root directory" target is a genuinely
   different concept (the filesystem's `/`, not a per-user directory);
   `unmark` collides with no listed acceptable alternative for non-
   checkbox UI (the guide's own carve-out); `spec` is also the "on spec"
   bid/contract idiom; `click-through` is a compound analytics term the
   bare-verb ban was never meant to reach.
3. **The posture**: auto-fix is retained **only** where a replacement
   cannot be wrong — the same word, normalized (spelling, hyphenation,
   casing, or a non-standard written form of the identical word). A pair
   that substitutes a _different_ word or phrase — even one that always
   looks safe, like `alright` → `OK` — moves to detection-only, because
   "this one looks safe" is exactly the per-pair judgement call that
   produced three rounds of misses. Mechanical classification, not
   another round of judgement, is what stops the class.

#### Result

**Fixable `swap`/`consistency` pairs: 230 → 126**, across 45 rules with a
`swap`/`consistency` assertion (up from 41 — 4 new rule ids from
splitting bundles that mixed same-word and different-word pairs; `fix`
is a whole-RULE flag, not per-pair, so a mixed bundle has to split). The
16 rules that remain fixable are exhaustively enumerated with before/after
fix output in the fix-posture report; four representative examples:

| Rule                             | Pair                        | Why it stays fixable                                                                                                                                                                                                                                                                              |
| -------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `microsoft/us-spelling`          | `centre` → `center`         | Spelling variant of the identical word (the brief's own textbook example).                                                                                                                                                                                                                        |
| `microsoft/spelling-hyphenation` | `e-mail` → `email`          | Hyphenation of the identical word.                                                                                                                                                                                                                                                                |
| `microsoft/az-case-fixable`      | `javascript` → `JavaScript` | Casing of the identical token; empirically re-verified against `applyMatchCase` this wave (case-sensitive matching means an ALL-CAPS input like `JAVASCRIPT` can never reach these keys in the first place, so the ALL-CAPS-shout no-op class `az-case-only` exists to avoid doesn't recur here). |
| `microsoft/az-grammar-usage`     | `broadcasted` → `broadcast` | Non-standard inflection of the identical word (the guide's own irregular past tense), the same class as "alot" → "a lot".                                                                                                                                                                         |

Two rules flipped for a reason found DURING this wave, not named in the
brief:

- **`microsoft/racial-ethnic-capitalization` was re-examined and correctly
  stays fixable, reversing an initial assumption.** It looked like the
  `az-case-only` no-op shape (case-only replacement), but hand-tracing
  `applyMatchCase` and confirming empirically shows it is not: every key
  is matched case-sensitively (`ignoreCase: false`) and is always
  all-lowercase, so `applyMatchCase`'s "already-Capitalized match" no-op
  branch can never trigger — the fix genuinely inserts the configured
  Title-Case replacement. Case-only pairs are not automatically a no-op;
  each has to be checked against the actual function, not just the shape
  of the rule.
- **`MSFT` → `Microsoft` (`az-abbreviations-names`) moved to detection-only
  for a fix-_mechanism_ defect, not a word-choice one.** `MSFT` is
  virtually always written all-caps (it's a stock ticker); with
  `ignoreCase: true`, `applyMatchCase`'s ALL-CAPS branch shouts a
  single-word replacement, so the "fix" would produce `"MICROSOFT"` (wrong
  casing for a trademark), not the configured `"Microsoft"`. Confirmed
  empirically (`applyMatchCase('MSFT', 'Microsoft')` → `'MICROSOFT'`).

#### Severity follows fixability

Every rule that became detection-only in this wave, and is word-choice/
phrasing guidance (not structural), moved from `error` to `warn` — a hard
CI failure a user cannot auto-resolve is disproportionate for a style
nit. Exception, deliberately not changed: `bias-free-terms` (bundles
`DMZ`) and `racial-ethnic-capitalization` stay at `error` — the existing
"sensitive category" carve-out already applied to `master-slave`,
`no-derogatory-slang`, and `accessibility-terms` (all detection-only at
`error` before this wave) is a considered, pre-existing exception to
"detection-only implies warn", not an oversight.

#### Step 4 (brief) — scoping the four headline false-positive terms

`DMZ`, `the ask`, `home directory`, and `spec` are the terms most likely
to visibly misfire on ordinary prose now that they're detection-only
(detection-only rules cannot corrupt, so this is a noise concern, not a
correctness one). Each gained a narrow anchor against its most common
unrelated sense — `DMZ(?!\s+(?:dividing|between|separating))`, `the
ask(?!\s+(?:tick|price|spread|size|quote))`, `home
directory(?!\s+for\s+(?:its|the|...)?\s*config)`, `(?<!\bon\s)\bspec\b` —
and all four sentences from the brief's corruption list now appear
verbatim in `microsoft-clean.md` under "Fix-posture near-misses",
producing zero findings. The other ~15 pairs this preset already
reclassified to detection-only in fix waves B/C (`hang`, `click`, `print
out`, ...) are deliberately NOT given this treatment — `microsoft-clean.md`
already documents that flagging every occurrence, including a compliant
one, is what detection-only means, and the brief only asks for the four
headline terms.

#### Gates

`pnpm build` (dist re-emitted), `pnpm test` (105 files, 1467 passed / 5
skipped), `pnpm parity --corpus monorepo-docs` (unchanged: 27425 = 27425,
0 unexplained), `npx nx run recheck:lint --max-warnings=0` (clean). Plus:
every one of the six corruption strings above and the four anchor
near-misses (`hang by a thread`, `hang back`, sentence-initial `Print out
is required`, `click depth`) through `--fix` twice — unchanged; every one
of the 126 remaining fixable pairs (across both presets, 240 combined)
verified programmatically — real change, idempotent, violation gone — not
sampled; every rule (including the 4 new ones from splitting bundles)
still fires on `microsoft-violations.md`; `microsoft-clean.md` still zero
findings with the four new near-misses added. Full command output and the
exhaustive fixable-rule table are in
`.superpowers/sdd/preset-fix-posture-report.md`.

### Fix-posture change, wave 2 — the proper-noun axis (2026-07-30)

> **RETIRED 2026-07-30 — see "Detection-only" at the end of this file.**
> This section's third axis (proper-noun collision) no longer determines
> which pairs are fixable in this preset: none are. Kept as historical
> record only.

Base commit `25a62c3d1f1`, branch `aa/recheck-style-guides`. Brief:
`.superpowers/sdd/preset-posture-fix2-brief.md`. Report:
`.superpowers/sdd/preset-fix-posture-report.md`'s "Wave 2" section.

#### The gap the first two axes didn't cover

An independent probe of the ~230 pairs the previous wave left fixable
found four more corruptions, all sharing one cause neither axis above
catches:

```
"The store offered a markdown of thirty percent."
   -> "...a Markdown of thirty percent."
"FinTech Group AG reported strong earnings."
   -> "fintech Group AG reported strong earnings."
"...processed by U.S. Bank on Tuesday"
   -> "...processed by US Bank"
"The USA Gymnastics team announced its roster."
   -> "The US Gymnastics team announced its roster."
```

`Markdown`, `FinTech`, `U.S. Bank`, `USA Gymnastics` are **proper nouns**
that happen to contain the very token a same-word normalization rule
targets. The guidance-shape axis is satisfied (each really is the same
word, just re-cased or re-punctuated) and the homograph axis, as
previously scoped ("does the avoid-term have an unrelated sense in
ordinary English"), doesn't ask the right question either — "U.S." has
no unrelated ordinary-English sense, yet "U.S. Bank" still breaks.

#### The third axis

A pair keeps `fix: true` only if **all three** hold:

1. **Same word, not a different one** (spelling/hyphenation/casing/
   non-standard form — never a substitution, and an abbreviation
   EXPANDED INTO A PHRASE — `aka` -> `also known as`, `spec` ->
   `specification` — counts as a substitution, not a respelling).
2. **No unrelated legitimate sense** (the homograph axis, wave 1).
3. **NEW — cannot occur as part of a real organization, product, brand,
   or place name.** Acronyms and single capitalizable words are the
   highest-risk shapes, because a rule that ignores case or normalizes
   punctuation will match a proper noun's own official spelling just as
   readily as ordinary prose.

#### Sweep and results

Every fixable `swap` pair in both presets (113 pairs across 15 rules in
this preset, plus 5 `consistency` pairs left untouched — 118 total; the
parallel sweep in `recheck/google` is documented in that preset's own
PROVENANCE.md) was checked against question 3. This preset's flips:

| Rule                         | Pair(s) flipped                                  | Real proper noun that collides                                                                                                                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `microsoft/usa-abbreviation` | `USA`/`U.S.A.`/`U.S.` -> `US` (all 3)            | "USA Gymnastics" (US national governing body), "U.S. Bank" (top-10 US bank), "U.S.A. Track and Field" (national governing body), "U.S. Steel" — named brief case.                                                                                                                         |
| `microsoft/us-spelling`      | `centre`/`centres` -> `center`/`centers`         | "Bell Centre" (Montreal Canadiens' arena, official English spelling) and "Centre County, Pennsylvania" (a real US county whose OWN official name keeps the British "re").                                                                                                                 |
| `microsoft/us-spelling`      | `catalogue`/`catalogues` -> `catalog`/`catalogs` | "Catalogue of Life" (a real, commonly-cited global species database whose own name is spelled with the British "ue").                                                                                                                                                                     |
| `microsoft/az-case-fixable`  | `boolean` -> `Boolean`                           | Not proper-noun (question 2, found during this sweep): lowercase `boolean` is the REQUIRED spelling of the OpenAPI/JSON Schema type name (`"type": "boolean"`) — exactly Redocly's own domain — and auto-capitalizing it would corrupt extremely common, completely correct schema prose. |

**4 pairs swept out of the 113 live `swap` pairs, all moved to a
detection-only sibling rather than anchored** — `microsoft/us-spelling`
keeps its remaining 21 pairs (the verb inflections `centred`/`centring`/
`catalogued`/`cataloguing` stay fixable: a participle doesn't head a
proper noun the way the bare noun does), and the new siblings
`microsoft/us-spelling-detect` and `microsoft/az-case-fixable-detect`
carry the four reclassified pairs at the SAME severity as their parent
rule (`error` — the guidance itself is still unconditionally correct;
only the auto-fix is unsafe, the same reasoning `bias-free-terms`/
`racial-ethnic-capitalization` already established for a "sensitive
category" carve-out). `microsoft/usa-abbreviation` itself flips whole-rule
to `fix: false`; severity drops `error` -> `warn`, matching this file's
policy for every other rule that becomes detection-only for a word-
choice/phrasing reason rather than a structural one.

**Fixable pairs: 126 -> 118** (113 `swap` + 5 `consistency`, unchanged).

#### Why `fix: false`, not another anchor

Every anchor added in fix waves B and C (`hang`, `print out`, `click`,
...) has independently leaked exactly one near-miss beyond wherever it
was tested (documented in those waves' own sections above). A casing/
abbreviation fix is low-value enough that detection alone is a fine
outcome — the user still learns the term needs a second look; a fourth
round of anchor-then-leak was not worth it for pairs this marginal.
`fix: false` was preferred over an anchor for every pair this wave found.

#### `aka` was misclassified, not newly found unsafe (recorded here for

cross-reference; the pair itself lives in `recheck/google`)

Expanding an abbreviation into a phrase is a substitution, not a
respelling — `aka` -> `also known as` should have flipped in wave 1
alongside `e.g.`/`i.e.` (the identical shape), not stayed fixable. See
`recheck/google`'s own PROVENANCE.md for the fix; noted here because this
file's wave-1 section states the two-axis criterion this correction
applies to.

#### Gates

`pnpm build` (dist re-emitted), `pnpm test` (105 files, 1490 passed / 5
skipped — 23 new tests this wave), `pnpm parity --corpus monorepo-docs
--profile default` (unchanged: 27425 = 27425, 0 unexplained), `npx nx run
recheck:lint --max-warnings=0` (clean). Every sentence in the brief's
acceptance set 1 (both presets) verified unchanged through `--fix` twice
and still detected against the correct new rule name; the ten wave-1
regression strings still inert; every rule (including the 2 new ones
here) still fires on `microsoft-violations.md`. Full output in
`.superpowers/sdd/preset-fix-posture-report.md`'s "Wave 2" section.

### Detection-only (2026-07-30)

Base commit `006c026a1f0`, branch `aa/recheck-style-guides`. Brief:
`.superpowers/sdd/preset-detection-only-brief.md`. Report:
`.superpowers/sdd/preset-detection-only-report.md`.

**This section REPLACES the fixability criterion described in every
"Fix wave" and "Fix-posture change" section above — it does not sit
alongside them as a fourth, stricter axis.** Those sections are kept below
(above this one), unedited, as the historical record of the criteria that
were tried and superseded; do not read any of them as current guidance. As
of this section, **`recheck/microsoft` ships zero fixable rules. Every rule
in this file is `fix: false`, unconditionally** — set structurally, once,
by a loop at the end of `buildMicrosoftPreset()`
(`src/config/presets/microsoft.ts`), not by auditing pairs against a
sharper rule. A dedicated test (`preset-microsoft.test.ts`'s
"is detection-only" describe block) reads the live preset object and fails
if any rule is ever fixable again — the same derive-from-the-preset shape
the per-pair coverage gate already uses, so this cannot regress silently
the way three prior narrowing passes did.

#### Why a fourth axis wasn't the answer

Three prior fix waves (A, B, C above) each patched the specific corrupting
pairs one probe found — 2, then 2, then 6 — and each following probe found
MORE, a rising rate, not a shrinking one. The fix-posture change and its
wave 2 (above) then replaced "patch what's found" with two, then three,
structural axes: same-word-normalized (not a substitution), no unrelated
homograph sense, and no real-proper-noun collision. Each pass shipped clean
against its own criterion and each was then probed again. The fifth
adversarial probe — against this preset and `recheck/google` together —
found **18 of 29 probed pairs (62%) still corrupting correct prose**, a
RISING hit rate after three rounds of narrowing, spanning every category
the three axes above treated as clean:

- **Spelling**, believed the safest category of all: Hemingway's real,
  correctly spelled published title _A Moveable Feast_ is corrected to "A
  Movable Feast" by this preset's own `microsoft/az-grammar-usage`'s
  `moveable` → `movable` pair — a genuine same-word normalization by every
  axis above (axis 1 passes, axis 2 finds no unrelated sense, axis 3 finds
  no proper-noun collision on the word "moveable" itself), corrupted anyway
  because the collision is with a specific, individually unforeseeable
  literary title rather than a common name pattern the axis could
  generalize against.
- **Hyphenation**: `microsoft/spelling-hyphenation`'s `dial up` →
  `dial-up` pair turns "Dial up the treble until the mix sounds right" (a
  phrasal verb — turn a knob up) into "Dial-up the treble..." (1990s modem
  technology used as an adjective). Same-word by every axis, wrong because
  the axes check the WORDS, not the GRAMMATICAL ROLE those words are
  playing in the sentence being fixed.
- **A correct verb conjugation broken outright**: `microsoft/az-grammar-usage`'s
  `zeroes` → `zeros` pair turns "the counter zeroes out" (a correctly
  conjugated verb) into "the counter zeros out" (the plural noun form used
  as a verb) — same word-pair, same axis clearance, grammatically wrong
  regardless of context.

Full round-5 acceptance evidence (these sentences and more, run through
`--fix` twice and confirmed byte-identical) lives in
`src/config/__tests__/preset-detection-only-acceptance.test.ts`, plus the
per-preset regression suites in `preset-microsoft.test.ts` and
`preset-google-fix-wave-c.test.ts` (both rewritten by this change to assert
"unchanged" where they used to assert a real rewrite). The `consistency`
engine bug this same change fixed — `it's`/`it is` collapsing into one
meaning via first-seen-wins, live since Phase 1 and reproduced exactly by
this preset's `microsoft/contraction-consistency` rule with
`microsoft/use-contractions` set to `severity: off` — is documented at the
engine level in `src/rules/scope/consistency.ts`'s `wordCount()` doc
comment, not here: it is independent of this preset and applies to any
config shipping a `consistency` rule, including a hypothetical future
preset.

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
`rule.fix !== false` check). The per-pair and per-token coverage gates
(`preset-microsoft.test.ts`) still require every rule to fire on its own
clean fixture, so a rule that neither fixes nor reports is still caught as
dead weight, same as before this change.
