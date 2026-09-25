# `diff`

## Introduction

The `diff` command compares two API descriptions and lists every change between them.
It gives each change an impact: the semver part that a release with this change must bump.

- `major`: the change can break a consumer, for example a removed operation.
- `minor`: the change adds to the API, for example a new path.
- `patch`: the change breaks nothing and adds nothing, for example a new description.

Use the command in CI to stop a breaking change before a release, or to calculate the next version of your API.

{% admonition type="warning" name="Experimental" %}
This is an experimental feature.
Its behavior, options, rule names, and output formats can change in future releases.
{% /admonition %}

## Usage

```bash
redocly diff <base> <revision>
redocly diff <base> <revision> [--fail-on=<impact>] [--check-version]
redocly diff <base> <revision> [--format=<value>] [--output=<path>]
redocly diff <base> <revision> [--config=<path>] [--skip-rule=<rule>]...
```

## Options

| Option          | Type     | Description                                                                                                                                                                                    |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| base            | string   | **REQUIRED.** Path, URL, or [alias](../configuration/reference/apis.md) of the older API description.                                                                                          |
| revision        | string   | **REQUIRED.** Path, URL, or alias of the newer API description.                                                                                                                                |
| --check-version | boolean  | Fail when the `info.version` of the revision is not bumped as much as the changes require. See [Check the declared version](#check-the-declared-version). Default value is `false`.            |
| --config        | string   | Specify path to the [configuration file](../configuration/index.md).                                                                                                                           |
| --fail-on       | string   | Exit with code `1` when a change of this impact or higher is found. <br /> **Possible values:** `major`, `minor`, `patch`, `none`. Default value is `major`.                                   |
| --format        | string   | Format for the output. See [Output formats](#output-formats). <br /> **Possible values:** `stylish`, `json`, `markdown`, `html`, `github-actions`, `next-version`. Default value is `stylish`. |
| --help          | boolean  | Show help.                                                                                                                                                                                     |
| --lint-config   | string   | Specify the severity level for the configuration file. <br /> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                            |
| --output, -o    | string   | Write the report to a file instead of stdout. Every format supports it except `github-actions`.                                                                                                |
| --skip-rule     | [string] | Turn off the [diff rules](../rules/diff-rules.md) with these names.                                                                                                                            |
| --version       | boolean  | Show version number.                                                                                                                                                                           |

## What the command reports

The command reports what you added, removed, or changed in the API.
The [diff rules](../rules/diff-rules.md) give each change its impact.
A change that no rule reports is `minor` if you added something, and `patch` in all other cases.

The command does not report these edits as changes:

- a new order of parameters, servers, or tags
- a new name of a path parameter, for example `/menu/{id}` to `/menu/{menuItemId}`

The diff rules support OpenAPI 3.x and AsyncAPI 3.
For other types of description, such as OpenAPI 2.0, the command reports the changes, but every change is `minor` or `patch`.
The command cannot compare two descriptions of different types, for example OpenAPI 2.0 and OpenAPI 3.1.

## Output formats

The command prints the report to stdout and all other messages to stderr.

| Format           | Output                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `stylish`        | The changes grouped by endpoint, webhook, AsyncAPI channel, operation, or server, with the rule messages and a `file:line:col` link. |
| `json`           | Every change with its impact, rule verdicts, values, and locations. Use this format when a script reads the result.                  |
| `markdown`       | A table of the changes, for a pull request comment.                                                                                  |
| `html`           | A page without external dependencies that you can open in a browser.                                                                 |
| `github-actions` | An `error` annotation on the pull request for each rule verdict of a `major` change. Changes of other impacts get no annotation.     |
| `next-version`   | Only the next version, for example `2.0.0`. See [Calculate the next version](#calculate-the-next-version).                           |

## Examples

### Stop a breaking change in CI

By default, the command exits with code `1` when it finds a `major` change:

```bash
redocly diff main/openapi.yaml openapi.yaml
```

To also fail on new features, set `--fail-on=minor`.
To get the report and never fail, set `--fail-on=none`.

### Check the declared version

With `--check-version`, the command also fails when the `info.version` of the revision is lower than the version that the changes require:

```bash
redocly diff main/openapi.yaml openapi.yaml --check-version
```

For example, if the base declares `1.2.0` and the changes are `major`, the revision must declare `2.0.0` or higher:

```text
❌ info.version went 1.2.0 → 1.3.0, but these changes require a major bump (2.0.0).
```

- Below version `1.0.0`, semver lets a `minor` release break the API.
  Thus, for a `major` change from `0.4.2`, the revision must declare `0.5.0` or higher.
- The command compares only the `major.minor.patch` numbers and ignores pre-release and build labels.
- A change to `info.version` itself does not require a bump.
- If the changes require a bump and `info.version` is not a semver string, the check fails.

### Calculate the next version

The `next-version` format prints the version of the base, bumped as the changes require:

```bash
NEXT_VERSION=$(redocly diff main/openapi.yaml openapi.yaml --format=next-version --fail-on=none)
```

If no change requires a bump, the command prints the base version.
Set `--fail-on=none` so that a `major` change does not stop your script.

### Comment on a pull request

To attach a report to a pull request, write it to a file:

```bash
redocly diff main/openapi.yaml openapi.yaml --format=markdown -o diff.md
```

To show each breaking change on the changed line, use the `github-actions` format in a GitHub Actions workflow:

```bash
redocly diff main/openapi.yaml openapi.yaml --format=github-actions
```

### Compare two APIs by their aliases

If you define both descriptions in the `apis` section of `redocly.yaml`, use their aliases:

```yaml
apis:
  cafe@v1:
    root: v1/openapi.yaml
  cafe@v2:
    root: v2/openapi.yaml
```

```bash
redocly diff cafe@v1 cafe@v2
```

### Change the impact of a rule

To make a rule give another impact, or to turn it off, add a [`diff` section](../configuration/reference/diff.md) to `redocly.yaml`:

```yaml
extends:
  - diff-recommended
diff:
  enum-values-added: minor
```

## Resources

- The [diff rules](../rules/diff-rules.md) that judge the changes, and how to configure them.
- [Diff rules in plugins](../custom-plugins/custom-diff-rules.md) for the changes that the built-in rules do not judge.
