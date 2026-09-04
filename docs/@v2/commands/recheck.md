# `recheck`

## Introduction

The `recheck` command lints Markdown files for prose and structure problems.
It checks headings, sentences, links, images, and Markdoc tags against a set of rules.
It also lints the `description` fields of API descriptions.
Each finding reports the file, line, and column of the description in the source.

Rules come from presets, such as `recheck/markdown`, that you add to the root `extends` in `redocly.yaml`.
The [`recheck` block](../configuration/reference/recheck.md) adjusts those rules.
If `redocly.yaml` has neither, the command uses `recheck/markdown`.
With no paths, the command lints the Markdown files under the project root and every API in `apis`.
With paths, a Markdown file or directory lints as pages, and an API description file lints its descriptions.

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
`--readability`, `--generate-baseline`, and `--generate-markdoc-schema` each replace the default lint action.
Use at most one of them in a run.
`--fix` works with the default lint action only.
{% /admonition %}

## Options

| Option                    | Type     | Description                                                                                                                       |
| ------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| paths                     | [string] | Files or directories to lint. Default value is the current directory.                                                             |
| --annotations-limit       | number   | Maximum number of annotations in the report.                                                                                      |
| --changed-list            | string   | Path to a file that lists changed files, one per line.                                                                            |
| --changed-only            | boolean  | Lint only the files listed in `--changed-list`.                                                                                   |
| --check                   | boolean  | Fail when the generated schema differs from the file in `--out`. Use with `--generate-markdoc-schema`.                            |
| --config                  | string   | Path to the [configuration file](../configuration/index.md).                                                                      |
| --exclude-rule            | [string] | Skip these rules.                                                                                                                 |
| --fix                     | boolean  | Apply fixes to the Markdown files. Alias: `-f`.                                                                                   |
| --format                  | string   | Format for the report.<br />**Possible values:** `table`, `json`, `sarif`, `github-actions`. Default value is `table`.            |
| --from                    | [string] | Module paths to read Markdoc tags from. Use with `--generate-markdoc-schema`.                                                     |
| --generate-baseline       | boolean  | Write a baseline file from the current errors.                                                                                    |
| --generate-markdoc-schema | boolean  | Generate a Markdoc tag schema from theme modules. Needs `--from` and `--out`.                                                     |
| --help                    | boolean  | Show help.                                                                                                                        |
| --lint-config             | string   | Specify the severity level for the configuration file.<br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`. |
| --out                     | string   | Output file for the generated schema.                                                                                             |
| --output-path             | string   | Write the report to this file instead of stdout. Applies to `--format json` and `sarif`.                                          |
| --readability             | boolean  | Report readability scores instead of lint findings.                                                                               |
| --rule                    | [string] | Run only these rules. Alias: `-r`.                                                                                                |
| --severity                | string   | Run only rules at this severity or higher.<br />**Possible values:** `info`, `warn`, `error`.                                     |
| --stats                   | boolean  | Print statistics per rule. Alias: `-s`.                                                                                           |
| --summary                 | string   | Print a summary of the run.<br />**Possible values:** `json`, `text`.                                                             |
| --summary-path            | string   | Write the summary to this file.                                                                                                   |
| --tags                    | [string] | Run only rules with these tags.                                                                                                   |
| --version                 | boolean  | Show version number.                                                                                                              |

## Examples

### Lint a folder

Add a preset to the root `extends`:

```yaml
extends:
  - recheck/markdown
```

Then run the command on a folder:

```bash
redocly recheck docs
```

The command lints every Markdown file under `docs` with the rules from `recheck/markdown`.
The report goes to stdout and progress messages go to stderr.

### Turn off a rule

Set the rule to `off` in the `recheck` block:

```yaml
extends:
  - recheck/markdown
recheck:
  rules:
    recheck/line-length: off
```

The run applies every rule from `recheck/markdown` except `recheck/line-length`.

### Annotate a pull request

```bash
redocly recheck docs --format=github-actions
```

In a GitHub Actions workflow, this format adds each finding as an annotation on the changed line.
Each finding is one line of output:

```text
::error title=recheck/single-h1,file=docs/index.md,line=2,endLine=2,col=1,endColumn=1::Multiple top-level headings in the same document
```

### Write a JSON report to a file

```bash
redocly recheck docs --format=json --output-path=recheck-report.json
```

The command writes the report to `recheck-report.json`.
`--output-path` applies to `--format json` and `sarif`.

### Use a baseline

A baseline records the current errors.
Later runs report only errors that the baseline does not list.

```bash
redocly recheck docs --generate-baseline
```

The command writes `recheck-baseline.yaml` next to `redocly.yaml`.
Add the file to the `recheck` block:

```yaml
recheck:
  baseline: ./recheck-baseline.yaml
```

After you fix errors, generate the baseline again and commit the smaller file.

### Lint API descriptions

```bash
redocly recheck openapi.yaml
```

The command lints every `description` in `openapi.yaml` and in the files it references.
Rules that need a whole document, such as the single-title rule, do not run on descriptions.
`--fix` does not change API files; it reports how many fixable findings it skipped.

To suppress one finding without a change to the API file, list it in `.redocly.lint-ignore.yaml` by file, rule, and pointer:

```yaml
openapi.yaml:
  recheck/line-length:
    - '#/info/description'
```

To adjust rules for descriptions only, set `apiDescriptions.rules` in the `recheck` block.

### Check readability

```bash
redocly recheck docs --readability
```

The command prints readability scores for each Markdown file instead of lint findings.
