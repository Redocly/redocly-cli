---
seo:
  title: Lint Markdown and prose with Recheck
  description: Check Markdown structure, prose style, and Markdoc tags with the redocly recheck command.
---

# Markdown and prose linting

Recheck is the Markdown linter built into Redocly CLI.
The [`recheck` command](../commands/recheck.md) reads the Markdown files in a folder and reports problems with their structure, their prose, and their Markdoc tags.
It replaces a separate markdownlint and Vale setup with one tool and one configuration file.

Recheck has two kinds of rules:

- **Markdown rules** check structure and formatting: heading levels, list indentation, blank lines, link syntax, tables, and code fences.
  They port every built-in markdownlint rule, and most of them fix the file for you with `--fix`.
  See [Markdown rules](./rules.md).
- **Prose rules** check the words: banned terms, spelling, repeated words, heading capitalization, sentence length, and readability.
  Each prose rule is an assertion such as `swap` or `pattern` applied to a scope such as `heading` or `sentence`.
  See [Prose rules](./assertions.md).

Ready-made [presets](./presets.md) bundle these rules: a markdownlint-compatible structural set, a prose starter, Markdoc tag checks, and rule sets adapted from the Google and Microsoft style guides.

## Quickstart

Run the command with no configuration to lint a folder with the `recheck/markdown` preset:

```bash
npx @redocly/cli@latest recheck docs
```

The report lists each finding with the rule name, the file and line, and a message.
Findings marked `[fixable]` can be repaired automatically:

```bash
npx @redocly/cli@latest recheck docs --fix
```

To keep the configuration, create a `redocly.yaml` file and add a preset to `extends`:

```yaml
extends:
  - recheck/markdown
```

If `redocly.yaml` already exists, add the preset next to your API ruleset:

```yaml
extends:
  - recommended
  - recheck/markdown
```

The `lint` command ignores Recheck presets, and the `recheck` command ignores API rulesets, so the two live side by side in one file.

## Configure rules

Presets go in the root `extends`.
Adjustments go in the [`recheck` block](../configuration/reference/recheck.md).
Each preset rule has a key such as `recheck/line-length` or `google/no-via`, and the block sets a severity or options for that key:

```yaml
extends:
  - recheck/markdown
  - recheck/prose
recheck:
  excludes:
    - CHANGELOG.md
  rules:
    recheck/line-length: off
    recheck/no-duplicate-heading:
      severity: warn
      assertions:
        no-duplicate-heading:
          siblingsOnly: true
```

The block can also declare new rules.
A new rule names an assertion, and for a prose assertion, a message:

```yaml
recheck:
  rules:
    recheck/no-via:
      severity: warn
      scope: sentence
      message: 'Use "through" or "by using" instead of "via".'
      assertions:
        pattern:
          ignoreCase: true
          tokens:
            - '\bvia\b'
```

Read [Prose rules](./assertions.md) for every assertion and its options.

### Severity levels

| Severity | Effect                                                       |
| -------- | ------------------------------------------------------------ |
| `error`  | Reported, and the command exits with code 1.                 |
| `warn`   | Reported. The command still exits with code 0.               |
| `info`   | Reported as an informational message. The exit code stays 0. |
| `off`    | The rule does not run.                                       |

### Fix findings automatically

A rule is fixable when its assertion knows how to repair the text.
Most Markdown rules are fixable, and so are the `swap`, `repetition`, `consistency`, `capitalization`, and `semantic-line-breaks` assertions.
Set `fix: false` on a rule to keep it detection-only.
The style guide presets set `fix: false` on every rule, because automatic word swaps changed the meaning of correct text in testing.

## Adopt Recheck on an existing project

A large documentation set rarely passes a new linter on the first run.
Three tools make adoption gradual:

- **Work rule by rule** with `--rule <name>` to see one rule's findings, then fix or configure that rule before moving to the next.
- **Measure before deciding** with `--stats` or `--summary=json`, which count findings per rule.
  Set a noisy rule to `warn` or `off` from the counts, not from taste.
- **Record a baseline** with `--generate-baseline`.
  The baseline records today's errors, and later runs fail only on new ones.
  See [Suppress findings](./suppress-findings.md#use-a-baseline).

For single lines or files that must stay as written, use [inline directives or exceptions](./suppress-findings.md).

## Run in CI

The `github-actions` format turns each finding into an annotation on the pull request:

```yaml
- name: Lint Markdown
  run: npx @redocly/cli@latest recheck docs --format=github-actions
```

The `sarif` format uploads to code scanning tools, and `json` feeds your own scripts.
See the [`recheck` command](../commands/recheck.md#formats) for the details of each format.

## Use with AI assistants

Two agent skills teach an AI coding assistant to work with Recheck:

- `recheck-lint` runs the command on the Markdown the assistant touched, applies `--fix`, and fixes the rest by hand before the change is committed.
- `recheck-config` writes and tunes the `recheck` block from measured counts instead of guesses.

Install them with the other Redocly CLI skills:

```bash
redocly skills
```

See the [`skills` command](../commands/skills.md) for the supported agents.

## Related pages

- [`recheck` command](../commands/recheck.md)
- [`recheck` configuration reference](../configuration/reference/recheck.md)
- [Presets](./presets.md)
- [Markdown rules](./rules.md)
- [Prose rules](./assertions.md)
- [Markdoc tags](./markdoc.md)
- [Suppress findings](./suppress-findings.md)
- [Migrate from markdownlint and Vale](../guides/migrate-from-markdownlint.md)
