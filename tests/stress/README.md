# Stress test on production specs

Compares the lint output of two CLI builds on real API descriptions:
Rebilly `api-definitions`, the GitHub REST description, and the Okta management description.
Unit tests and small fixtures do not catch every change in output.
A 9 MB description with thousands of examples does.

## In CI

Add the `test-major-changes` label to a pull request.
The [stress workflow](../../.github/workflows/stress.yaml) builds the pull request and the fork point of its branch from `main`, lints 7 cells with both builds, and posts one comment with the result.
Identical output passes the check.
Any difference in exit code or in the reported problems fails the check, and the comment lists the added, removed, and changed problems.
Remove the label to turn the comment into "skipped".

## Cells

| Spec                           | Config                                         |
| ------------------------------ | ---------------------------------------------- |
| Rebilly `all@latest`           | the repository's own `redocly.yaml`            |
| Rebilly `openapi/openapi.yaml` | `configs/recommended.yaml`, `configs/all.yaml` |
| GitHub `api.github.com.yaml`   | `configs/recommended.yaml`, `configs/all.yaml` |
| Okta `management-minimal.yaml` | `configs/recommended.yaml`, `configs/all.yaml` |

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
`compare.mjs` prints the report and exits with 1 when any cell differs.

## Add a spec or a cell

Add a download step and a `lint_cell` line in `run.sh`.
The first argument of `lint_cell` is the cell name.
The other arguments go to `redocly lint`.
