# `recheck`

## Introduction

The `recheck` block configures the [`recheck`](../../commands/recheck.md) command.
It adjusts the rules that the Recheck presets provide, and it sets file excludes, a baseline, and Markdoc parsing.

The block does not accept `extends`.
Add Recheck presets, such as `recheck/markdown`, to the root `extends` of `redocly.yaml`.

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

- baseline
- string
- Path to the baseline file, relative to the directory of `redocly.yaml`.
  A run reports only errors that the baseline does not list.

---

- markdoc
- boolean or [Markdoc object](#markdoc-object)
- Turn on Markdoc-aware parsing.
  `true` is the same as `{ schema: realm }`.

{% /table %}

### Rules object

Each key is a rule name.
Each value is a severity string (`off`, `info`, `warn`, or `error`) or a [rule object](#rule-object).
Use a severity string to change the severity of a preset rule or to turn it off.

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
  The message that the rule reports.

---

- assertions
- object
- **REQUIRED**.
  The checks that the rule runs.
  Each assertion type has its own options.

---

- fix
- boolean
- Let `--fix` apply this rule's fix.
  Only some assertion types offer a fix.

---

- tags
- [string]
- Labels for the `--tags` option.

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
- Where the rule runs: `all`, `heading`, `sentence`, `paragraph`, `code`, or `raw`.

---

- appliesTo
- [string]
- File globs that the rule runs on.
  Default value is every Markdown file.

---

- excludes
- [string]
- File globs that the rule skips.

---

- exceptions
- [Exceptions object](#exceptions-object)
- Files and lines that the rule does not check.

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
- Line patterns that the rule skips.

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
- Path to a YAML file that maps tag names to tag schemas.

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
```

This config adds the `recheck/markdown` preset in the root `extends`.
The `recheck` block skips `CHANGELOG.md`, uses a baseline file, turns on Markdoc-aware parsing, turns off one rule, and adds one rule.

## Related options

- [extends](./extends.md) lists the Recheck presets at the root of `redocly.yaml`.
- [rules](./rules.md) configures API linting rules, which are separate from `recheck.rules`.

## Resources

- Command reference for [`recheck`](../../commands/recheck.md).
