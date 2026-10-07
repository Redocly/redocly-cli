# `recheck`

## Introduction

The `recheck` command lints Markdown files for structure and prose problems.
It checks headings, lists, links, tables, code fences, and whitespace, and the words themselves: banned terms, spelling, repeated words, heading case, sentence length, and readability.
With `--fix`, it repairs the findings it can.
`recheck` also lints the `description` fields of API descriptions.
Each finding reports the file, line, and column of the description in the source.

Rules come from presets such as `recheck/markdown` that you add to the root `extends` of `redocly.yaml`, and from the [`recheck` block](../configuration/reference/recheck.md), which adjusts preset rules and adds your own.
The [Markdown and prose linting](../recheck/index.md) section explains the presets, the rules, and how to write a prose rule.

How the command picks its rules:

- With no `redocly.yaml`, it uses `recheck/markdown`.
- With a `redocly.yaml` that has neither a Recheck preset in `extends` nor a `recheck` block, it checks nothing and says so.
- It reads the root configuration only.
  Recheck settings under `apis.<name>` are not used, and the command warns about them.

With no paths, the command lints the Markdown files under the current directory and every local API in `apis`.
It skips a remote API and says so.
With paths, a Markdown file or directory lints as pages, and an API description file lints its descriptions.
With an alias from `apis`, the command lints the descriptions of that API.

## Usage

```bash
redocly recheck
redocly recheck <paths>...
redocly recheck <paths>... [--fix] [--rule=<name>] [--skip-rule=<name>] [--tags=<tag>]
redocly recheck <paths>... [--format=<value>] [--max-problems=<n>] [--stats] [--summary=<value>]
redocly recheck <paths>... --readability [--format=table|json]
redocly recheck <paths>... --generate-baseline
redocly recheck --generate-markdoc-schema --from=<path>... --output=<path> [--check]
redocly recheck --help
```

{% admonition type="info" name="One action per run" %}
`--readability`, `--generate-baseline`, and `--generate-markdoc-schema` each replace the default lint action.
Use at most one of them in a run.
`--fix` works with the default lint action only.
{% /admonition %}

## Options

| Option                    | Type     | Description                                                                                                                                           |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| paths                     | [string] | Files, folders, or aliases from `apis` to lint. Default value is the current directory. See [Choose files](#choose-files).                            |
| --check                   | boolean  | Fail when the generated schema differs from the file in `--output`. Use with `--generate-markdoc-schema`.                                             |
| --config                  | string   | Path to the [configuration file](../configuration/index.md).                                                                                          |
| --fix                     | boolean  | Apply fixes to the Markdown files. Alias: `-f`. See [Fix findings](#fix-findings).                                                                    |
| --format                  | string   | Format for the report.<br />**Possible values:** `table`, `json`, `sarif`, `github-actions`. Default value is `table`. See [Formats](#formats).       |
| --from                    | [string] | Module paths to read Markdoc tags from. Use with `--generate-markdoc-schema`.                                                                         |
| --generate-baseline       | boolean  | Write a baseline file from the current errors. See [Use a baseline](#use-a-baseline).                                                                 |
| --generate-markdoc-schema | boolean  | Generate a Markdoc tag schema from theme modules. Needs `--from` and `--output`. See [Generate a Markdoc tag schema](#generate-a-markdoc-tag-schema). |
| --help                    | boolean  | Show help.                                                                                                                                            |
| --lint-config             | string   | Specify the severity level for the configuration file.<br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                     |
| --max-problems            | number   | Maximum number of problems in the report; applies to every format. See [Limit the report](#limit-the-report).                                         |
| --output                  | string   | Output file for the generated schema. Use with `--generate-markdoc-schema`.                                                                           |
| --readability             | boolean  | Report readability scores instead of lint findings. See [Check readability](#check-readability).                                                      |
| --rule                    | [string] | Run only these rules. Alias: `-r`. See [Work rule by rule](#work-rule-by-rule).                                                                       |
| --skip-rule               | [string] | Skip these rules.                                                                                                                                     |
| --stats                   | boolean  | Print the number of findings per rule after the table. Alias: `-s`.                                                                                   |
| --summary                 | string   | Print a summary of the run.<br />**Possible values:** `json`, `text`. See [Summarize a run](#summarize-a-run).                                        |
| --summary-path            | string   | Write the summary to this file instead of printing it.                                                                                                |
| --tags                    | [string] | Run only rules with these tags.                                                                                                                       |

Every option can also be set with an environment variable prefixed `REDOCLY_CLI_RECHECK_`, for example `REDOCLY_CLI_RECHECK_FORMAT=json`.

## Output and exit codes

The report goes to standard output, and progress messages go to standard error, so a `json` or `sarif` report can be piped to a file or another tool.

| Exit code | Meaning                                                                         |
| --------- | ------------------------------------------------------------------------------- |
| 0         | No errors. Warnings and info findings may be present.                           |
| 1         | At least one error, a configuration error, a missing baseline, or a failed run. |

Only findings with severity `error` fail the run.
See [severity levels](../recheck/index.md#severity-levels).

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

The command lints every Markdown file under `docs` with the rules from `recheck/markdown` and prints a table:

```text
📋 Found 3 issue(s):

blanks-around-headings    docs/index.md:1:1    Headings should be surrounded by blank lines (Expected: 1; Actual: 0; Below) [fixable]
blanks-around-headings    docs/index.md:2:1    Headings should be surrounded by blank lines (Expected: 1; Actual: 0; Above) [fixable]
single-h1                 docs/index.md:2:1    Multiple top-level headings in the same document

   2 of 3 fixable with --fix

   3 error(s)
```

Each row shows the rule name without its `recheck/` prefix, the file with line and column, and the message.
`[fixable]` marks the findings that `--fix` repairs.

### Choose files

Pass any number of files and folders.
A folder is searched for `.md` and `.markdown` files, and the search skips hidden folders, `node_modules`, `dist`, and `build`:

```bash
redocly recheck README.md docs guides/intro.md
```

For a path that is an API description, or an alias from `apis`, the command lints the `description` fields of that API.
When a file or folder exists with the same name as an alias, the command lints the file or folder.

### Fix findings

```bash
redocly recheck docs --fix
```

The command writes the fixes to the files, lints them again until no more fixes apply, and lists every edit it made.
The report then shows only the findings that remain.

A fix is withheld when it overlaps another fix or would rewrite a [Markdoc tag](../recheck/markdoc.md).
Withheld fixes are counted in the output, and their findings stay in the report.

Set `fix: false` on a rule in the `recheck` block to keep that rule detection-only.

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
The [Presets](../recheck/presets.md#tune-a-preset) page shows how to change a severity or an option.

### Work rule by rule

A new rule on an existing document set can produce hundreds of findings.
Run one rule at a time to clear them:

```bash
redocly recheck docs --rule=line-length
redocly recheck docs --rule=line-length --fix
```

`--rule` and `--skip-rule` accept the name the report prints or the full key, such as `recheck/line-length` or `google/no-via`.
Repeat the option for several rules.
A name that matches no rule in the configuration is an error, not an empty run, and the message lists the available rules.

`--tags` runs only the rules that carry one of the given tags.
The Markdown rules carry markdownlint's tags, such as `headings`, `links`, `whitespace`, `code`, and `accessibility`.
Your own rules carry the `tags` you set on them.

```bash
redocly recheck docs --tags=headings --tags=links
```

### Formats

#### table

The default, shown in [Lint a folder](#lint-a-folder).
Add `--stats` to print the number of findings per rule after the table.

#### json

```bash
redocly recheck docs --format=json > recheck.json
```

The report has a `summary` with the file count and a breakdown per rule, and an `issues` list with one entry per finding:

```json
{
  "summary": {
    "filesScanned": 1,
    "totalIssues": 1,
    "breakdown": {
      "recheck/single-h1": { "errors": 1, "warnings": 0, "info": 0, "total": 1 }
    }
  },
  "issues": [
    {
      "file": "docs/index.md",
      "line": 2,
      "column": 1,
      "text": "# Second title",
      "match": "Second title",
      "ruleName": "recheck/single-h1",
      "severity": "error",
      "message": "Multiple top-level headings in the same document",
      "fixable": false
    }
  ]
}
```

#### sarif

```bash
redocly recheck docs --format=sarif > recheck.sarif
```

A SARIF 2.1.0 report for code scanning tools, such as GitHub code scanning.

#### github-actions

```bash
redocly recheck docs --format=github-actions
```

In a GitHub Actions workflow, this format adds each finding as an annotation on the changed line.
An error becomes `::error`, a warning `::warning`, and an info finding `::notice`.
Each finding is one line of output:

```text
::error title=recheck/single-h1,file=docs/index.md,line=2,endLine=2,col=1,endColumn=1::Multiple top-level headings in the same document
```

GitHub shows at most 10 error and 10 warning annotations per step, so pair this format with `--max-problems`:

```yaml
- name: Lint Markdown
  run: npx @redocly/cli@latest recheck docs --format=github-actions --max-problems=20
```

### Limit the report

```bash
redocly recheck docs --max-problems=20
```

The command sorts the findings by severity, then by file, line, and column, and reports the first 20.
The table's counts still cover every finding, and a note on standard error says how many were hidden.
Without the option, every finding is reported.

### Summarize a run

```bash
redocly recheck docs --summary=text
redocly recheck docs --summary=json --summary-path=recheck-summary.json
```

The summary counts the files scanned and the findings by severity and by rule.
It prints on standard error, or goes to the file in `--summary-path`.
Use it to decide the severity of each rule from the counts when you [adopt Recheck](../recheck/index.md#adopt-recheck-on-an-existing-project).

### Use a baseline

A baseline records the current errors.
Later runs report only errors that the baseline does not list.

```bash
redocly recheck docs --generate-baseline
```

The command writes `.redocly.recheck-baseline.yaml` next to `redocly.yaml`.
Commit the file.
Later runs pick it up automatically and print how many findings matched, how many are new, and how many baseline entries are stale.

After you fix errors, generate the baseline again and commit the smaller file.
A stale baseline fails the run, so the file always equals reality.
[Use a baseline](../recheck/suppress-findings.md#use-a-baseline) describes the file format and the rules of comparison.
When an API description does not parse, the command writes no baseline and fails.

### Lint API descriptions

```bash
redocly recheck openapi.yaml
```

The command lints every `description` in `openapi.yaml` and in the files it references.
Rules that need a whole document, such as `recheck/single-h1`, do not run on descriptions.
`--fix` does not change API files.
It reports how many fixable findings it skipped.
An API description that does not parse is an error and fails the run.

To suppress one finding without a change to the API file, list it in `.redocly.lint-ignore.yaml` by file, rule, and pointer:

```yaml
openapi.yaml:
  recheck/line-length:
    - '#/info/description'
```

Key the rule by its full name, such as `recheck/line-length`, or by its short name.
A local API that references a remote `$ref` makes the command fetch it, the same as `redocly lint`.
The command lints only descriptions in local files.

To adjust rules for descriptions only, set `apiDescriptions.rules` in the `recheck` block.

### Check readability

```bash
redocly recheck docs --readability
redocly recheck docs --readability --format=json
```

The command prints one row per Markdown file with its Flesch reading ease, Flesch-Kincaid grade, Automated Readability Index, word count, and sentence count, followed by the medians.
The score reads the prose only: headings, code, front matter, and Markdoc tags do not count.
A file with no prose shows no score.

This action never fails the run.
To fail on a readability bound, add a rule with the [`metric` assertion](../recheck/assertions.md#metric), which reads the same prose and the same formulas.

### Generate a Markdoc tag schema

```bash
redocly recheck --generate-markdoc-schema --from=@theme/markdoc/schema.js --output=markdoc-tags.yaml
redocly recheck --generate-markdoc-schema --from=@theme/markdoc/schema.js --output=markdoc-tags.yaml --check
```

The first command reads the `tags` export of a theme module and writes a tags file that `recheck.markdoc.extend.tagsFile` can load.
The second compares the file with a fresh generation and fails if it differs, for CI.
See [Markdoc tags](../recheck/markdoc.md#generate-a-tags-file-from-a-theme) for the details.

### Use a custom configuration file

```bash
redocly recheck docs --config=./config/redocly.yaml
```

The baseline file is looked up next to the configuration file that is used.

## Resources

- [Markdown and prose linting](../recheck/index.md)
- [`recheck` configuration reference](../configuration/reference/recheck.md)
- [Presets](../recheck/presets.md)
- [Markdown rules](../recheck/rules.md)
- [Prose rules](../recheck/assertions.md)
- [Suppress findings](../recheck/suppress-findings.md)
- [Migrate from markdownlint and Vale](../guides/migrate-from-markdownlint.md)
