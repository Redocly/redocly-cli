---
seo:
  title: Compare API descriptions with the diff command
  description: Compare two API descriptions and list changes with semver impact to catch breaking changes or determine the next version of your API.
---

# `diff`

## Introduction

The `diff` command compares two API descriptions and lists the changes between them.
The command gives each change an impact: the semver part that a release with this change must bump.

- `major`: can break a client, for example a removed operation
- `minor`: adds to the API, for example a new path
- `patch`: does not break or add anything, for example a new description

Use the command in CI to stop breaking changes, or to get the next version of your API.

{% admonition type="warning" name="Experimental" %}
This is an experimental feature.
Its behavior, options, rule names, and output formats can change in future releases.
{% /admonition %}

## Usage

```bash
redocly diff <base> <revision>
redocly diff <base> <revision> [--fail-on=<impact>] [--check-version]
redocly diff <base> <revision> [--format=<value>] [--output=<path>]
redocly diff <base> <revision> [--config=<path>] [--extends=<ruleset>]... [--skip-rule=<rule>]...
```

## Options

| Option          | Type     | Description                                                                                                                                                                                    |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| base            | string   | **REQUIRED.** Path, URL, [alias](../configuration/reference/apis.md), or [Git revision file](#compare-with-a-git-revision) of the older API description.                                       |
| revision        | string   | **REQUIRED.** Path, URL, alias, or Git revision file of the newer API description.                                                                                                             |
| --check-version | boolean  | Fail if `info.version` of the revision is lower than the version that the changes require. See [Check the version](#check-the-version). Default value is `false`.                              |
| --config        | string   | Specify path to the [configuration file](../configuration/index.md).                                                                                                                           |
| --extends       | [string] | Use these rulesets in place of the `extends` list of the configuration file. See [Turn on the diff rules for one run](#turn-on-the-diff-rules-for-one-run).                                    |
| --fail-on       | string   | Exit with code `1` if a change has this impact or a higher impact. <br /> **Possible values:** `major`, `minor`, `patch`, `none`. Default value is `major`.                                    |
| --format        | string   | Format for the output. See [Output formats](#output-formats). <br /> **Possible values:** `stylish`, `json`, `markdown`, `html`, `github-actions`, `next-version`. Default value is `stylish`. |
| --help          | boolean  | Show help.                                                                                                                                                                                     |
| --lint-config   | string   | Specify the severity level for the configuration file. <br /> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                            |
| --output, -o    | string   | Write the report to this file. All formats support this option, except `github-actions`.                                                                                                       |
| --skip-rule     | [string] | Turn off these [diff rules](../rules/diff-rules.md) for this run.                                                                                                                              |
| --version       | boolean  | Display version number.                                                                                                                                                                        |

## How the command compares descriptions

- The [diff rules](../rules/diff-rules.md) find the changes that can break a client and set their impact.
  If no rule reports a change, an addition is `minor` and any other change is `patch`.
- A new component is `patch`, because it has no effect until something uses it.
- The command follows `$ref`s, also into other files.
  It shows a change in a component at the first place that uses the component, with the line of the change in its file.
- The command detects renamed items, such as paths, properties, and parameters.
  If the new item is at least half the same as the old one, the command shows one rename instead of a removal and an addition.
- A new order of list items, such as parameters or `oneOf` subschemas, is not a change.
- The command applies the [decorators](../decorators.md) from your configuration, as the `bundle` command does.
  For example, with the `remove-x-internal` decorator, the command does not report changes to internal operations.
- The diff rules support OpenAPI 3.x and AsyncAPI 3.
  For other description types, the command lists the changes, but all changes are `minor` or `patch`.
- The command cannot compare descriptions of different types, for example OpenAPI 2.0 and OpenAPI 3.1.
- If the revision has errors, such as a `$ref` that does not resolve, the command fails, because it can miss changes in the unresolved parts.

## Output formats

The command prints the report to stdout and all other messages to stderr.

| Format           | Output                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `stylish`        | The changes grouped by path, webhook, channel, operation, or server, with rule messages and file locations. |
| `json`           | All data of each change. Use this format in scripts.                                                        |
| `markdown`       | A table of the changes for a pull request comment.                                                          |
| `html`           | A standalone page that you open in a browser.                                                               |
| `github-actions` | An error annotation for each rule message of a `major` change.                                              |
| `next-version`   | Only the next version, for example `2.0.0`. See [Get the next version](#get-the-next-version).              |

## Examples

### Stop breaking changes in CI

By default, the command exits with code `1` if it finds a `major` change:

```bash
redocly diff main/openapi.yaml openapi.yaml
```

To also fail on new features, use `--fail-on=minor`.
To never fail, use `--fail-on=none`.

### Compare with a Git revision

To read a description from Git, write the revision, a colon, and the path of the file, as you do for `git show`:

```bash
redocly diff origin/main:openapi.yaml openapi.yaml
```

This command compares `openapi.yaml` on the `origin/main` branch with `openapi.yaml` in your working directory.

The revision can be a branch, a tag, or a commit, for example `main`, `v1.0.0`, `HEAD~1`, or `4d6f1c5`.
The two descriptions can come from Git:

```bash
redocly diff v1.0.0:openapi.yaml v2.0.0:openapi.yaml
```

- The path starts at the root of the repository.
  To start at the current directory, put `./` before the path, for example `main:./openapi.yaml`.
- If the description has `$ref`s to other files, the command reads these files from the same revision.
- The command uses the configuration file in your working directory for the two descriptions.
  If the file is the `root` of an API in the configuration file, the command uses the settings of this API.
- If a file or an API alias has the same name as the argument, the command uses the file or the alias.
- The command reads only the revisions that are in your local repository.
  It does not download revisions.

In GitHub Actions, the default checkout has only the last commit.
Get the full history, so that the base branch is in the local repository:

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
  - run: npx @redocly/cli diff origin/${{ github.base_ref }}:openapi.yaml openapi.yaml
```

### Check the version

With `--check-version`, the command also fails if `info.version` of the revision is lower than the version that the changes require:

```bash
redocly diff main/openapi.yaml openapi.yaml --check-version
```

For example, if the base version is `1.2.0` and a change is `major`, the revision version must be `2.0.0` or higher:

```text
❌ info.version went 1.2.0 → 1.3.0, but these changes require a major bump (2.0.0).
```

- Below version `1.0.0`, semver allows a `minor` release to break the API.
  Thus, a `major` change from `0.4.2` requires `0.5.0` or higher.
- The command compares only the `major.minor.patch` numbers.
  It ignores pre-release and build labels.
- A change to `info.version` does not require a bump.
- If the changes require a bump and `info.version` is not a semver string, the check fails.

### Get the next version

The `next-version` format prints the base version, bumped as the changes require:

```bash
NEXT_VERSION=$(redocly diff main/openapi.yaml openapi.yaml --format=next-version --fail-on=none)
```

If no change requires a bump, the command prints the base version.
Use `--fail-on=none`, so that a `major` change does not stop your script.

### Comment on a pull request

Write the report to a file, and attach the file to a pull request comment:

```bash
redocly diff main/openapi.yaml openapi.yaml --format=markdown -o diff.md
```

To show each breaking change on the changed line, use the `github-actions` format in a GitHub Actions workflow:

```bash
redocly diff main/openapi.yaml openapi.yaml --format=github-actions
```

### Compare two APIs by their aliases

If the `apis` section of `redocly.yaml` has both descriptions, use their aliases:

```yaml
apis:
  cafe@v1:
    root: v1/openapi.yaml
  cafe@v2:
    root: v2/openapi.yaml
    decorators:
      remove-x-internal: on
```

```bash
redocly diff cafe@v1 cafe@v2
```

The command applies the decorators of the revision API, `cafe@v2`, to both descriptions.

### Change the impact of a rule

To change the impact of a rule, or to turn it off, add a [`diff` section](../configuration/reference/diff.md) to `redocly.yaml`:

```yaml
extends:
  - diff-recommended
diff:
  enum-values-added: minor
```

### Turn on the diff rules for one run

The diff rules come from the `diff-recommended` ruleset.
Without a configuration file, the command uses this ruleset.
If your configuration file does not have `diff-recommended` in its `extends` list, use the `--extends` option:

```bash
redocly diff main/openapi.yaml openapi.yaml --extends=diff-recommended
```

The option replaces the `extends` list of the configuration file for this run.
The command keeps all other settings of the file, for example the `diff` section.
To use more than one ruleset, use the option again for each ruleset.

## Resources

- **[Diff rules](../rules/diff-rules.md)** - Changes that each rule reports and how the rules use the direction of the data
- **[`diff` configuration](../configuration/reference/diff.md)** - Set the impact of each diff rule in `redocly.yaml`
- **[Per-API configuration](../configuration/apis.md)** - Define API aliases to compare two APIs by name
- **[Decorators](../decorators.md)** - Change the descriptions that you publish and that the `diff` command compares
- **[`lint` command](./lint.md)** - Check one API description against your API standards
