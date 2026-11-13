# Provenance: `recheck/technical-english`

An original rule set that helps writers follow the principles of ASD-STE100 Simplified Technical English.

**ASD-STE100 Simplified Technical English is a Copyright and a Trade Mark of ASD, Brussels, Belgium.**

This preset is an independent work.
ASD and the ASD Simplified Technical English Maintenance Group (STEMG) do not review, validate, approve, certify, or endorse it, per their long-standing non-endorsement policy.
The preset reproduces no part of the standard: not its text, and not its dictionary.
Each rule implements a publicly documented writing principle in Recheck's own vocabulary and wording.

## The correspondence this rests on

Adam Altman asked the STEMG for permission on 2026-08-07 and again on 2026-08-19.
The STEMG replied on 2026-08-20: they endorse no tools by policy, they do not object to a factual reference to ASD-STE100 as the reference standard for a third-party rule set, any reference must carry the copyright and trademark statement above, and reproduction of the standard in whole or in part stays governed by its copyright and its Special Usage Rights section.
The full reply is preserved on issue #25886.

## What ships

| Rule                                 | Principle                                                               | Default                                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `technical-english/sentence-length`  | Short sentences: at most 20 words in procedures, 25 in descriptive text | `warn`, max 25 (a linter cannot tell procedure from description; tighten to 20 for procedure-only content) |
| `technical-english/paragraph-length` | At most 6 sentences per paragraph                                       | `warn`                                                                                                     |
| `technical-english/passive-voice`    | Use the active voice                                                    | `info` (heuristic: be-verb + participle; the irregular-participle list is ordinary linguistic knowledge)   |

The numeric thresholds are factual claims about what the standard recommends, widely documented in public secondary material and ASD's own public pages.
Facts are not copyrightable expression; the rule messages state them in this project's own words.

## Deliberate omissions

- **The approved-word dictionary.**
  The STE dictionary is part of the copyrighted standard; encoding it would reproduce the standard in part.
  The Special Usage Rights section (Issue 9, Copyright notices page) was reviewed on 2026-08-20: it grants free reproduction rights only to a closed list of aerospace and defense organizations (ASD, AIA, AIAC, and ICCAIA member ecosystems, their customers, defense ministries, Airlines for America, airworthiness authorities, and universities for educational purposes).
  Redocly is not in any of those categories, and a public npm package distributes past every one of them.
  Outside that list, the copyright notice requires written authority from an ASD officer for any reproduction in whole or in part — so a dictionary rule stays out of scope unless ASD grants that written authority.
  For general word-choice checking, compose with `recheck/plain-language`.
- **Noun-cluster limits (three-noun rule).** Needs part-of-speech tagging; a regex approximation would flag ordinary prose constantly.
- **Present-tense enforcement.** `will` is legitimate in changelogs, roadmaps, and promises.
- **One instruction per sentence.** Not reliably detectable; sentence length is the closest proxy.

## Composition

Pairs well with `recheck/plain-language` (word choice, public-domain source) and `recheck/markdown` (structure).
Expected overlap when stacked with a flagship preset: the flagships ship their own sentence-length rules with different sourced thresholds; the findings co-fire by design, the same posture `plain-language/paragraph-sentence-count` documents.
