# Stress test on production specs

Compares the lint output of two CLI builds on real API descriptions:
Rebilly `api-definitions`, the GitHub REST description, and the Okta management description.
Unit tests and small fixtures do not catch every change in output.
A 9 MB description with thousands of examples does.

## In CI

The [stress workflow](../../.github/workflows/stress.yaml) runs on every pull request to `main`.
It builds the pull request and a base, lints 4 cells with both builds, and posts one comment with the result.

| Pull request | Base                                        | The check fails when     |
| ------------ | ------------------------------------------- | ------------------------ |
| Regular      | the fork point of its branch from `main`    | the output differs       |
| Release      | the latest release (`@redocly/cli@<x.y.z>`) | a lint run wrote no JSON |

A release pull request is `main` plus the version changes, so its fork point shows no difference.
The latest release shows what a user gets after an upgrade.
Those differences come from pull requests that already showed them, so they do not fail the release pull request.

A fork pull request cannot post a comment.
The [comment workflow](../../.github/workflows/stress-comment.yaml) posts its report.

## Read the report

When the output differs, the report has one table: one row per rule that differs, and one column per cell.
A value such as `+40/-30/~5` means 40 added, 30 removed, and 5 changed problems.

- An added (`+`) or removed (`-`) problem is a problem that only one build reports.
- A changed (`~`) problem is a problem that both builds report at the same place from the same rule, with a different message, severity, line, or column.
- `(new)` marks a rule that reports no problems in the base build.
  `(removed)` marks a rule that reports no problems in the head build.
  A renamed rule shows as two rows: the old name with `(removed)`, and the new name with `(new)`.
- Below the table, each cell that differs has a collapsed block with examples.
  It shows the first problems of each kind per rule, in the format `<file>:<line>:<column> [<severity>] <message>`.

## Cells

| Spec                           | Config                                                                    |
| ------------------------------ | ------------------------------------------------------------------------- |
| Rebilly `all@latest`           | `custom`: the repository's own `redocly.yaml`, with its rules and plugins |
| Rebilly `openapi/openapi.yaml` | `configs/recommended.yaml`                                                |
| GitHub `api.github.com.yaml`   | `configs/recommended.yaml`                                                |
| Okta `management-minimal.yaml` | `configs/recommended.yaml`                                                |

Every spec is pinned to a commit in `run.sh`.

## Run it locally

Build the two versions you want to compare, then run the matrix once per build and compare the two output directories:

```bash
bash tests/stress/run.sh <other-checkout>/packages/cli/lib/index.js tests/stress/out/base
bash tests/stress/run.sh packages/cli/lib/index.js tests/stress/out/head
node tests/stress/compare.mjs tests/stress/out/base tests/stress/out/head tests/stress/out/report.md
```

`run.sh` needs `git`, `curl`, and `pnpm` 11 or newer, which Rebilly requires.
On the first run it downloads the specs into `tests/stress/api-definitions/` and `tests/stress/specs/`, which git ignores.
`compare.mjs` prints the report.
It exits with 1 when any cell differs, and with 2 when a lint run wrote no JSON.

## Add a spec or a cell

Add a download step and a `lint_cell` line in `run.sh`.
The first argument of `lint_cell` is the cell name in the form `<API description>.<config>`.
The other arguments go to `redocly lint`.
