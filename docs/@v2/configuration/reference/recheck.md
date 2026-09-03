# `recheck`

## Introduction

The `recheck` block configures the [`recheck`](../../commands/recheck.md) command.
It sets rules and options for Markdown prose and structure linting.

The block does not accept `extends`.
Name Recheck presets in the root `extends` of `redocly.yaml` instead, for example `recheck/markdown`.

## Options

{% table %}

- Option
- Type
- Description

---

- rules
- [Rules object](#rules-object)
- A map of rule name to a severity, or to a [rule object](#rule-object).

---

- excludes
- [string]
- File globs to skip for every rule in this block.
  Recheck merges this list with each rule's own `excludes`.

---

- baseline
- string
- Path to the baseline file, resolved from this file's directory.
  A run reports only findings missing from the baseline.

---

- markdoc
- boolean or [Markdoc object](#markdoc-object)
- Turn on Markdoc-aware parsing.
  `true` is shorthand for `{ schema: realm }`.

---

- apiDescriptions
- [API descriptions object](#api-descriptions-object)
- Rule overrides for descriptions inside API documents.
  A later release applies this path.

{% /table %}

### Rules object

A map of rule name to value.
Each value is a severity string (`off`, `info`, `warn`, or `error`) or a [rule object](#rule-object).

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
- **REQUIRED**.
  The message this rule reports.

---

- assertions
- object
- **REQUIRED**.
  Rule-specific assertion settings.
  Each built-in rule documents its own assertion shape.

---

- fix
- boolean
- Turn on `--fix` support for this rule, where the rule offers a fix.

---

- tags
- [string]
- Labels for the `--tags` option.

---

- description
- string
- A longer note about the rule's intent.

---

- link
- string
- A URL with more detail about the rule.

---

- scope
- string or [string]
- Where the rule runs, for example `heading`, `sentence`, `paragraph`, `code`, or `all`.

---

- appliesTo
- [string]
- File globs this rule runs on.
  Default: every Markdown file.

---

- excludes
- [string]
- File globs this rule skips.

---

- exceptions
- [Exceptions object](#exceptions-object)
- Files and lines this rule does not check.

{% /table %}

### Exceptions object

{% table %}

- Option
- Type
- Description

---

- files
- [string]
- File globs this rule skips.

---

- lines
- [string]
- Line patterns this rule skips.

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
- Add project tags on top of the chosen schema.

{% /table %}

### Extend object

{% table %}

- Option
- Type
- Description

---

- tags
- object
- Tag name to tag schema.
  Provide `tags`, `tagsFile`, or both.

---

- tagsFile
- string
- Path to a YAML file that maps tag names to tag schemas.

{% /table %}

### API descriptions object

{% table %}

- Option
- Type
- Description

---

- rules
- [Rules object](#rules-object)
- Rule overrides for descriptions embedded in API documents.
  A later release applies these overrides; this release parses and stores them only.

{% /table %}

## Example

```yaml
extends:
  - recheck/markdown
recheck:
  excludes:
    - CHANGELOG.md
  baseline: ./recheck-baseline.yaml
  markdoc: true
  rules:
    recheck/line-length: off
    recheck/readability-floor:
      severity: warn
      message: 'Readability (%s) is %s; expected between %s and %s.'
      assertions:
        metric:
          formula: flesch-reading-ease
          min: 30
  apiDescriptions:
    rules:
      recheck/line-length: off
```

This config names the `recheck/markdown` preset in the root `extends`.
The `recheck` block then skips `CHANGELOG.md`, points at a baseline file, turns on Markdoc-aware parsing, and adjusts two rules.

## Related options

- [extends](./extends.md) names Recheck presets at the root of `redocly.yaml`.
- [rules](./rules.md) covers rule configuration for API linting, a separate rule set from `recheck.rules`.

## Resources

- Command reference for [`recheck`](../../commands/recheck.md).
