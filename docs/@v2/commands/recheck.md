# `recheck`

## Introduction

The `recheck` command lints Markdown prose and structure.
Configuration lives in the [`recheck` block](../configuration/reference/recheck.md) of `redocly.yaml`.
Name presets in the root `extends`, for example `recheck/markdown`.
Without a `recheck` block or a `recheck/*` preset, the command falls back to `recheck/markdown`.

Progress messages go to stderr.
The report goes to stdout.
For `--format json` and `sarif`, use `--output-path` to write the report to a file instead.

A later release adds linting for API descriptions.
This release skips them and prints a notice for each skipped file.

## Usage

```bash
redocly recheck
redocly recheck <paths>...
redocly recheck [--fix]
redocly recheck [--readability]
redocly recheck [--generate-baseline]
redocly recheck [--generate-markdoc-schema] [--from=<path>...] [--out=<path>] [--check]
redocly recheck --help
```

{% admonition type="info" name="One action per run" %}
The actions are `--readability`, `--generate-baseline`, and `--generate-markdoc-schema`.
Pick at most one action per run.
`--fix` applies to the default lint action only.
{% /admonition %}

## Options

| Option                    | Type     | Description                                                                                                                       |
| ------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| paths                     | [string] | Files or directories to lint. Default: the current directory.                                                                     |
| --annotations-limit       | number   | Cap the number of annotations reported.                                                                                           |
| --changed-list            | string   | Path to a file that lists changed files, one per line.                                                                            |
| --changed-only            | boolean  | Lint only files listed by `--changed-list`.                                                                                       |
| --check                   | boolean  | Fail if the generated schema differs from `--out`. Pair it with `--generate-markdoc-schema`.                                      |
| --config                  | string   | Path to the [configuration file](../configuration/index.md).                                                                      |
| --exclude-rule            | [string] | Skip these rules.                                                                                                                 |
| --fix                     | boolean  | Apply fixes to Markdown files. Alias: `-f`.                                                                                       |
| --format                  | string   | Use a specific output format.<br />**Possible values:** `table`, `json`, `sarif`, `github-actions`. Default value is `table`.     |
| --from                    | [string] | Module paths to read Markdoc tags from. Pair it with `--generate-markdoc-schema`.                                                 |
| --generate-baseline       | boolean  | Write the baseline file from the current findings.                                                                                |
| --generate-markdoc-schema | boolean  | Generate a Markdoc tag schema from theme modules. Needs `--from` and `--out`.                                                     |
| --help                    | boolean  | Show help.                                                                                                                        |
| --lint-config             | string   | Specify the severity level for the configuration file.<br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`. |
| --out                     | string   | Output file for the generated schema.                                                                                             |
| --output-path             | string   | Write the report to a file instead of stdout. Applies to `--format json` and `sarif` only.                                        |
| --readability             | boolean  | Report readability scores instead of linting.                                                                                     |
| --rule                    | [string] | Run only these rules. Alias: `-r`.                                                                                                |
| --severity                | string   | Minimum severity to run.<br />**Possible values:** `off`, `info`, `warn`, `warning`, `error`.                                     |
| --stats                   | boolean  | Print rule statistics. Alias: `-s`.                                                                                               |
| --summary                 | string   | Print a run summary.<br />**Possible values:** `json`, `text`.                                                                    |
| --summary-path            | string   | Write the summary to a file.                                                                                                      |
| --tags                    | [string] | Run only rules with these tags.                                                                                                   |
| --version                 | boolean  | Show version number.                                                                                                              |

## Examples

### Lint with a preset

Name a preset in the root `extends`, and run the command against a folder.

```yaml
extends:
  - recheck/markdown
```

```bash
redocly recheck docs
```

The command lints every Markdown file under `docs` with the `recheck/markdown` preset.

### Disable one rule

Set a rule to `off` under `recheck.rules` to turn it off everywhere.

```yaml
extends:
  - recheck/markdown
recheck:
  rules:
    recheck/line-length: off
```

```bash
redocly recheck docs
```

This run skips `recheck/line-length` and applies every other rule from `recheck/markdown`.

### Use the GitHub Actions format in CI

```bash
redocly recheck docs --format=github-actions
```

GitHub reads this format and places each finding next to its line in the pull request diff.

<pre>
::error title=recheck/single-h1,file=docs/index.md,line=2,endLine=2,col=1,endColumn=1::Multiple top-level headings in the same document
</pre>

### Generate and apply a baseline

Record every current error, then gate only new ones.

```bash
redocly recheck docs --generate-baseline
```

This writes `recheck-baseline.yaml` next to `redocly.yaml`.
Add its path to the `recheck` block so future runs read it.

```yaml
recheck:
  baseline: ./recheck-baseline.yaml
```

A later run reports only findings missing from the baseline.
Regenerate the baseline once you fix a batch of findings, and commit the smaller file.

### Report readability scores

```bash
redocly recheck docs --readability
```

This command scores each Markdown file for readability instead of linting it.
Use the scores to find pages that need simpler wording or shorter sentences.
