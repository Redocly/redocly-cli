# Migrate from markdownlint and Vale

The `recheck` command covers the ground of [markdownlint](https://github.com/DavidAnson/markdownlint) and [Vale](https://vale.sh) in one tool and one configuration file.
This guide maps the configuration of each tool onto Recheck.

The first step is to [install Redocly CLI](../installation.md).

## Replace markdownlint

### Update the command

Replace `markdownlint docs` or `markdownlint-cli2 "docs/**/*.md"` with:

```bash
redocly recheck docs
```

Replace `--fix` with the same flag:

```bash
redocly recheck docs --fix
```

### Translate the configuration

Every markdownlint rule has a Recheck rule with the same name under the `recheck/` prefix.
Start from the preset that matches your markdownlint style, then move each override from `.markdownlint.yaml` into the `recheck` block:

| markdownlint                  | Recheck                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| `default: true`               | `extends: [recheck/markdown]`                                          |
| `extends: style/relaxed.json` | `extends: [recheck/markdown-relaxed]`                                  |
| `MD013: false`                | `recheck/line-length: off`                                             |
| `MD013: { line_length: 120 }` | `recheck/line-length` with `assertions.line-length.lineLength: 120`    |
| `blank_lines: false`          | The five `blanks-around-*` and `no-multiple-blanks` rules set to `off` |

Option names use camel case instead of snake case: `line_length` becomes `lineLength`, and `siblings_only` becomes `siblingsOnly`.

For example, this `.markdownlint.yaml`:

```yaml
default: true
MD004: false
MD013:
  line_length: 120
  tables: false
MD024:
  siblings_only: true
MD033: false
```

becomes this `redocly.yaml`:

```yaml
extends:
  - recheck/markdown
recheck:
  rules:
    recheck/ul-style: off
    recheck/line-length:
      severity: error
      assertions:
        line-length:
          lineLength: 120
          tables: false
    recheck/no-duplicate-heading:
      severity: error
      assertions:
        no-duplicate-heading:
          siblingsOnly: true
    recheck/no-inline-html: off
```

The [Markdown rules](../recheck/rules.md) page lists every rule with its markdownlint id and options.

### Replace inline comments

Recheck does not read markdownlint's HTML comment directives.
Replace each one with the equivalent [Recheck directive](../recheck/suppress-findings.md#inline-directives), written as an HTML comment in the same place:

| markdownlint comment                   | Recheck comment                         |
| -------------------------------------- | --------------------------------------- |
| `markdownlint-disable MD013`           | `recheck-disable line-length`           |
| `markdownlint-enable MD013`            | `recheck-enable line-length`            |
| `markdownlint-disable-next-line MD013` | `recheck-disable-next-line line-length` |
| `markdownlint-disable-file`            | `recheck-disable-file`                  |

Recheck names rules by name, not by `MD` id.

### Two differences in defaults

- `no-trailing-spaces` allows exactly two trailing spaces by default, because that is a Markdown hard line break.
  Set `strict: true` to report every trailing space, as markdownlint does.
- `no-duplicate-heading` adds the `respectSections`, `caseSensitive`, and `ignoreCommonHeadings` options.
  Their defaults match markdownlint.

## Replace Vale

### Update the command

Replace `vale docs` with the same `recheck` command.
Structural and prose rules run in one pass:

```bash
redocly recheck docs
```

### Translate styles

A Vale style is a folder of YAML rule files.
Each file becomes one entry in `recheck.rules`, and the Vale `extends` type becomes the Recheck assertion:

| Vale `extends`   | Recheck assertion                                       |
| ---------------- | ------------------------------------------------------- |
| `substitution`   | `swap`                                                  |
| `existence`      | `pattern`                                               |
| `occurrence`     | `occurrence`                                            |
| `repetition`     | `repetition`                                            |
| `consistency`    | `consistency`                                           |
| `conditional`    | `conditional`                                           |
| `capitalization` | `capitalization`                                        |
| `metric`         | `metric`                                                |
| `spelling`       | `spelling`                                              |
| `sequence`       | No equivalent. These rules need part-of-speech tagging. |

The other Vale keys map one to one: `message` stays `message`, `level` becomes `severity` (`suggestion` becomes `info`), `scope` stays `scope`, `link` stays `link`, `ignorecase` becomes `ignoreCase`, and `nonword` stays `nonword`.
Vale's `swap`, `tokens`, and `either` keys move under the assertion.

For example, this Vale rule in `styles/Acme/BritishEnglish.yml`:

```yaml
extends: substitution
message: 'Use the US spelling "%s" instead of British "%s".'
level: error
ignorecase: true
swap:
  colour: color
  behaviour: behavior
```

becomes:

```yaml
recheck:
  rules:
    acme/british-english:
      severity: error
      scope: summary
      message: 'Use the US spelling "%s" instead of British "%s".'
      assertions:
        swap:
          ignoreCase: true
          wordBoundary: true
          pairs:
            colour: color
            behaviour: behavior
```

Vale skips code by default, and Recheck's prose scopes do the same.
Set `scope: summary` to read the document's prose, or a narrower scope such as `sentence` or `heading`.
The default scope `all` reads the whole file, code included.
The [Prose rules](../recheck/assertions.md) page lists every assertion and option.

### Replace packages

Vale packages for the Google and Microsoft style guides have Recheck presets:

| Vale package           | Recheck preset                               |
| ---------------------- | -------------------------------------------- |
| `Google`               | `recheck/google`                             |
| `Microsoft`            | `recheck/microsoft`                          |
| `alex` or `Inclusive`  | `recheck/inclusive-language`                 |
| `proselint` (in part)  | `recheck/plain-language`                     |
| `write-good` (in part) | `recheck/prose` and `recheck/plain-language` |

The presets are adapted from the live style guides, not from the Vale packages, so their rule sets differ in detail.
See [Presets](../recheck/presets.md) for what each one contains.

### Replace the vocabulary

Vale's `accept.txt` becomes the `exceptions` list of a `capitalization` rule or the `vocab` list of a `spelling` rule.
Vale's `reject.txt` becomes a `pattern` rule.
Recheck adds a built-in list of technical proper nouns to both, so most entries for product names are no longer needed.

### Replace in-text comments

Vale's `vale off` and `vale on` comments become `recheck-disable` and `recheck-enable`.
A comment that turns one Vale rule off, such as `vale Acme.Rule = NO`, becomes `recheck-disable acme/rule`.
Each one stays an HTML comment in the same place.

## Run both tools during the transition

Recheck reports in the formats that CI expects: `github-actions` for pull request annotations, `sarif` for code scanning, and `json` for scripts.
Run Recheck next to the old tools for a few pull requests, compare the findings, then remove the old configuration.
A [baseline](../recheck/suppress-findings.md#use-a-baseline) keeps the switch from failing the build on findings the old tools never reported.
