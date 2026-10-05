# `recheck`

## Introduction

The `recheck` block configures the [`recheck`](../../commands/recheck.md) command.
It adjusts the rules that the [Recheck presets](../../recheck/presets.md) provide, adds your own rules, and sets file excludes and Markdoc parsing.

The block does not accept `extends`.
Add Recheck presets, such as `recheck/markdown`, to the root `extends` of `redocly.yaml`.
The block merges on top of the presets that the same file lists in `extends`.
Presets and shared config files merge in `extends` order, so a preset listed after a shared file overrides the `recheck` block of that file.
An unknown preset name, such as `recheck/nope`, is a configuration error.

Rules merge by key.
A severity string changes only the severity of a preset rule.
A rule object sets its own keys over the preset's, and its `assertions` merge by assertion id: an assertion you set replaces the preset's assertion of the same id as a whole, options included.
A severity string for a key that no preset defines is a configuration error, because the rule has no assertions.

## Options

{% table %}

- Option
- Type
- Description

---

- rules
- [Rules object](#rules-object)
- Rule names mapped to a severity or to a [rule object](#rule-object).

---

- excludes
- [string]
- File globs that every rule in this block skips.
  Recheck adds this list to each rule's own `excludes`.

---

- markdoc
- boolean or [Markdoc object](#markdoc-object)
- Turn on Markdoc-aware parsing.
  `true` is the same as `{ schema: realm }`.

{% /table %}

### Rules object

Each key is a rule name in the form `<namespace>/<name>`, such as `recheck/line-length`, `google/no-via`, or `acme/product-names`.
Each value is a severity string (`off`, `info`, `warn`, or `error`) or a [rule object](#rule-object).
Use a severity string to change the severity of a preset rule or to turn it off.
Use a rule object to change a preset rule's options or to add a rule.

### Rule object

{% table %}

- Option
- Type
- Description

---

- severity
- string
- **REQUIRED**.
  One of `off`, `info`, `warn`, or `error`.

---

- message
- string
- The message that the rule reports.
  **REQUIRED** for a [prose rule](../../recheck/assertions.md), which uses an assertion such as `pattern` or `metric`.
  A [Markdown rule](../../recheck/rules.md), which uses an assertion such as `line-length`, takes its default message when the entry has none.
  `%s` placeholders are filled by the assertion; each assertion documents what it fills.

---

- assertions
- object
- **REQUIRED** when the rule is not from a preset.
  The checks that the rule runs, keyed by assertion id.
  A [Markdown rule](../../recheck/rules.md) is keyed by its name, such as `line-length`, and a [prose assertion](../../recheck/assertions.md) by its id, such as `swap`.
  Each assertion has its own options.

---

- fix
- boolean
- Let `--fix` apply this rule's fix.
  Default value is `true` for an assertion that offers a fix.
  Set `false` to keep the rule detection-only.

---

- tags
- [string]
- Labels for the `--tags` option of the command.

---

- description
- string
- A note about the purpose of the rule.

---

- link
- string
- A URL with more detail about the rule.

---

- scope
- string or [string]
- Where the rule reads text, such as `summary`, `heading`, `sentence`, or `paragraph`.
  Default value is `all`, the whole file.
  See [Scopes](../../recheck/assertions.md#scopes) for the full list and the selector syntax.

---

- appliesTo
- [string]
- File globs that the rule runs on.
  Default value is every Markdown file.
  See [File targeting](../../recheck/suppress-findings.md#file-targeting) for how globs match.

---

- excludes
- [string]
- File globs that the rule skips.

---

- exceptions
- [Exceptions object](#exceptions-object)
- Files and lines that the rule does not check.
  See [Suppress findings](../../recheck/suppress-findings.md).

{% /table %}

### Exceptions object

{% table %}

- Option
- Type
- Description

---

- files
- [string]
- File globs that the rule skips.

---

- lines
- [string]
- Text fragments.
  The rule skips every line that contains one of them.
  Matching is case-sensitive.

{% /table %}

### Markdoc object

{% table %}

- Option
- Type
- Description

---

- schema
- `realm` or `false`
- **REQUIRED**.
  `realm` validates tags against the built-in Realm schema.
  `false` parses and pairs Markdoc tags without a schema check.

---

- extend
- [Extend object](#extend-object)
- Add your own tags on top of the chosen schema.
  See [Markdoc tags](../../recheck/markdoc.md) for the tag schema shape and how parsing changes other rules.

{% /table %}

### Extend object

{% table %}

- Option
- Type
- Description

---

- tags
- object
- Tag names mapped to tag schemas.
  Set `tags`, `tagsFile`, or both.

---

- tagsFile
- string
- Path to a YAML file that maps tag names to tag schemas, relative to `redocly.yaml`.
  Inline `tags` win over the file.
  The [`--generate-markdoc-schema`](../../commands/recheck.md#generate-a-markdoc-tag-schema) action writes this file from a theme module.

{% /table %}

## Examples

### Adjust preset rules

```yaml
extends:
  - recheck/markdown
  - recheck/markdoc
recheck:
  excludes:
    - CHANGELOG.md
  markdoc: true
  rules:
    recheck/line-length: off
    recheck/no-duplicate-heading:
      severity: warn
      assertions:
        no-duplicate-heading:
          siblingsOnly: true
```

This config adds two presets in the root `extends`.
The `recheck` block skips `CHANGELOG.md` for every rule, turns on Markdoc-aware parsing, turns off one rule, and changes the severity and one option of another.

### Add a prose rule

```yaml
extends:
  - recheck/markdown
  - recheck/prose
recheck:
  rules:
    recheck/readability-floor:
      severity: warn
      message: 'Readability (%s) is %s; expected between %s and %s.'
      appliesTo:
        - 'docs/guides/**'
      assertions:
        metric:
          formula: flesch-reading-ease
          min: 30
    acme/no-via:
      severity: warn
      scope: sentence
      message: 'Use "through" or "by using" instead of "via".'
      link: https://example.com/style-guide#via
      assertions:
        pattern:
          ignoreCase: true
          tokens:
            - '\bvia\b'
```

The first rule reads a readability score for the guides only.
The second reports a banned word in every sentence, under the project's own `acme/` namespace.
The [Prose rules](../../recheck/assertions.md) page lists every assertion and its options.

### Share Recheck configuration between projects

A shared configuration file can carry both presets and a `recheck` block:

```yaml
# https://example.com/redocly-shared.yaml
extends:
  - recheck/markdown
  - recheck/prose
recheck:
  rules:
    recheck/line-length: off
```

```yaml
# redocly.yaml
extends:
  - https://example.com/redocly-shared.yaml
recheck:
  rules:
    recheck/capitalization: error
```

The root file's block merges last, so it can tighten or relax what the shared file set.

## Related options

- [extends](./extends.md) lists the Recheck presets at the root of `redocly.yaml`.
- [rules](./rules.md) configures API linting rules, which are separate from `recheck.rules`.

## Resources

- Command reference for [`recheck`](../../commands/recheck.md).
- [Markdown and prose linting](../../recheck/index.md), [Presets](../../recheck/presets.md), [Markdown rules](../../recheck/rules.md), [Prose rules](../../recheck/assertions.md), [Markdoc tags](../../recheck/markdoc.md), and [Suppress findings](../../recheck/suppress-findings.md).
