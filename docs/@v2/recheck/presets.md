---
seo:
  title: Recheck presets
  description: The rule sets that the recheck command can extend, and how to combine and tune them.
---

# Presets

A preset is a named set of Recheck rules.
Add presets to the root `extends` of `redocly.yaml`, and adjust their rules in the [`recheck` block](../configuration/reference/recheck.md).

```yaml
extends:
  - recheck/markdown
  - recheck/prose
```

Presets merge in the order listed, so a later preset overrides an earlier one for the same rule key.
The `recheck` block of the same file merges last.
An unknown preset name such as `recheck/nope` is a configuration error.

## Structural presets

These presets contain the [Markdown rules](./rules.md).
Their rule keys start with `recheck/`.

### recheck/markdown

All 53 markdownlint rules at `error`, with the upstream default options.
This is the preset the command uses when there is no `redocly.yaml`.
It is the equivalent of markdownlint's `default: true`.

### recheck/markdown-relaxed

The same 53 rules as `recheck/markdown`, with eleven rules turned off, the same as markdownlint's `relaxed` style:
`no-trailing-spaces`, `no-hard-tabs`, `no-multiple-blanks`, `no-multiple-space-blockquote`, `no-blanks-blockquote`, `line-length`, `ul-indent`, `no-inline-html`, `no-bare-urls`, `fenced-code-language`, and `first-line-h1`.

### recheck/minimal

Five rules that catch mistakes rather than enforce a style: `no-trailing-spaces`, `no-hard-tabs`, `single-trailing-newline`, `no-reversed-links`, and `no-empty-links`.

### recheck/markdoc

Four rules that check Markdoc tag syntax such as `{% tag attr="value" %}`.
They run only when the `recheck` block also turns on [Markdoc parsing](./markdoc.md) with `markdoc: true`.
Without it, the command prints a warning that the rules can never report.

| Rule                          | Severity | Checks                                                                                                                                                                                              |
| ----------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recheck/markdoc-syntax`      | `error`  | Malformed tag spans, unquoted attribute values, and close tags that carry attributes.                                                                                                               |
| `recheck/markdoc-pairing`     | `error`  | Unclosed, orphaned, or crossed tag pairs, and a self-closing tag written with a close tag.                                                                                                          |
| `recheck/markdoc-unknown-tag` | `warn`   | A tag name the schema does not declare.                                                                                                                                                             |
| `recheck/markdoc-attributes`  | `error`  | A missing required attribute, a value outside the attribute's `enum`, a wrong type, or a duplicate attribute. An unknown attribute name is always reported at `warn`, whatever the rule's severity. |

### recheck/api-descriptions

The `recheck/markdown` rules without the seven that do not fit Markdown embedded in another document, such as an OpenAPI `description` field: `single-h1`, `first-line-h1`, `front-matter`, `single-trailing-newline`, `link-fragments`, `line-length`, and `ul-indent`.
The `recheck` command does not lint API descriptions yet, so this preset is for a later release.

## Prose presets

These presets contain [prose rules](./assertions.md).
Add them next to a structural preset, because they check words and not Markdown syntax.

### recheck/prose

A small starter set, all at `warn`, scoped to prose so that code samples and front matter are never touched:

| Rule                     | Checks                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `recheck/repetition`     | An adjacent repeated word, such as "the the". Fixable.                                                                            |
| `recheck/consistency`    | One spelling per file for `behavior`/`behaviour`, `color`/`colour`, `license`/`licence`, and `organize`/`organise`. Fixable.      |
| `recheck/capitalization` | Headings use sentence case. Detection-only, because an automatic fix lowercases proper nouns that are not in the exceptions list. |

`extends: [recheck/markdown, recheck/prose]` replaces a markdownlint plus Vale setup in one line.

### recheck/google

Rules adapted from the [Google developer documentation style guide](https://developers.google.com/style) (CC BY 4.0).
The 99 rules cover heading, list, table, and link structure, sentence-case headings, sentence length, voice and contractions, plain language, product naming, and inclusive terminology.
Rule keys start with `google/`.
Structural rules are `error`; word choice and punctuation rules are `warn`.
Every rule is detection-only.

Each rule links to its source page in the guide.
The provenance of every rule, and every guide entry that was considered and left out, is recorded in [`presets/google/PROVENANCE.md`](https://github.com/Redocly/redocly-cli/blob/main/packages/recheck/presets/google/PROVENANCE.md).

### recheck/microsoft

Rules adapted from the [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/) (CC BY 4.0).
The 93 rules cover structure, the guide's numeric limits (paragraph length, list length, comma density, alt text length), the "use contractions" rule, US spelling, bias-free terminology, and a large A-Z word list.
Rule keys start with `microsoft/`.
Structural rules and the unconditional word list entries are `error`; voice and punctuation rules are `warn`.
Every rule is detection-only.

Unlike `recheck/google`, this preset flags the input-specific verbs `click`, `press`, and `hit` in favor of `select`.
The provenance is in [`presets/microsoft/PROVENANCE.md`](https://github.com/Redocly/redocly-cli/blob/main/packages/recheck/presets/microsoft/PROVENANCE.md).

### recheck/inclusive-language

Eleven rules for terms that both the Google and the Microsoft guides say to avoid, such as `master`/`slave`, `blacklist`/`whitelist`, `he/she`, and ableist phrases.
Rule keys start with `inclusive-language/`.
All rules are `warn` and detection-only.

Because the preset is the intersection of the two style guides, most of its rules duplicate a rule in `recheck/google` or `recheck/microsoft`.
Use it on its own or with `recheck/prose`.

### recheck/plain-language

Ten rules from the [US federal plain language guidance](https://digital.gov/guides/plain-language) (public domain): paragraph length, filler phrases, complex words, redundant pairs, double negatives, jargon, and excess intensifiers.
Rule keys start with `plain-language/`.
The paragraph length rules are `error`; the rest are `warn`.
All rules are detection-only.

The RFC 2119 keyword `shall` is never flagged, because API documentation uses it with a defined meaning.

### recheck/technical-english

Three rules that follow the principles of ASD-STE100 Simplified Technical English: at most 25 words per sentence (`warn`), at most 6 sentences per paragraph (`warn`), and a passive voice heuristic (`info`).
Rule keys start with `technical-english/`.
The preset reproduces no part of the standard and not its dictionary.
For word choice, add `recheck/plain-language`.

ASD-STE100 Simplified Technical English is a copyright and a trademark of ASD, Brussels, Belgium.
This preset is an independent work that ASD does not review or endorse.

## Tune a preset

Your `recheck` block wins over every preset.
Set a rule to a severity string to change how it reports:

```yaml
extends:
  - recheck/markdown
  - recheck/microsoft
recheck:
  rules:
    microsoft/az-navigation: off # turn a rule off
    microsoft/heading-sentence-case: warn # downgrade an error
    recheck/line-length:
      severity: warn
      assertions:
        line-length:
          lineLength: 120
```

To silence one occurrence instead of the whole rule, use an [inline directive](./suppress-findings.md#inline-directives).

{% admonition type="warning" name="Assertion options replace, they do not merge" %}
A rule's `assertions` merge by assertion id, not by option.
If you set one option on a preset's `swap` or `pattern` assertion, your object replaces the preset's whole assertion, including its `pairs` or `tokens`.
The config then fails validation with a message such as `swap requires a "pairs" object`.

To reject one term from a bundled word list, turn the rule off, restate the whole list, or use an inline directive on each occurrence.
The `exceptions` option of `capitalization` and the `ignore` option of `spelling` compose with the built-in lists, so they do not have this edge.
{% /admonition %}

## Example configs

The repository ships a generated example config for each style guide preset under [`packages/recheck/examples/`](https://github.com/Redocly/redocly-cli/tree/main/packages/recheck/examples).
Each file shows the two-line `extends` to paste, the tuning patterns that work, and the preset's full resolved rule set for reference.
