# Stress test on production specs

Compares the lint output of two CLI builds on the Rebilly, GitHub, and Okta API descriptions.
`run.sh` pins every spec to a commit.

## In CI

The [stress workflow](../../.github/workflows/stress.yaml) runs on every pull request to `main` and posts the result as a comment.
The base of a pull request is its fork point from `main`, and the check fails when the output differs.
The base of a release pull request is the latest release, and the check fails only when a lint run fails.

## Read the report

The table has one row per rule that differs and one column per cell.
`+40/-30/~5` means 40 added, 30 removed, and 5 changed problems.
`(new)` and `(removed)` mark a rule that reports problems in one build only, for example a renamed rule.

## Run it locally

`run.sh` needs `git`, `curl`, and `pnpm` 11 or newer.
Run `npm run compile` in both checkouts first.

```bash
bash tests/stress/run.sh <other-checkout>/packages/cli/lib/index.js tests/stress/out/base
bash tests/stress/run.sh packages/cli/lib/index.js tests/stress/out/head
node tests/stress/compare.mjs tests/stress/out/base tests/stress/out/head tests/stress/out/report.md
```

## Add a spec

Add a download step and a `lint_cell` line in `run.sh`.
The cell name has the form `<API description>.<config>`.
