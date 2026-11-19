# Lint output comparison

Compares the lint output of two CLI builds on the Rebilly, GitHub, and Okta API descriptions.
`run.sh` pins every spec to a commit.

## In CI

The [lint output workflow](../../.github/workflows/lint-output.yaml) runs on every pull request to `main` and posts the result as a comment.
The base is the first parent of the merge commit, and the check fails when the output differs.

## Read the report

The table has one row per rule that differs and one column per cell.
`+40/-30/~5` means 40 added, 30 removed, and 5 changed problems.
`(new)` and `(removed)` mark a rule that reports problems in one build only, for example a renamed rule.

## Run it locally

`run.sh` needs `git`, `curl`, and `pnpm` 11 or newer.
Run `npm run compile` in both checkouts first.

```bash
bash tests/lint-output/run.sh <other-checkout>/packages/cli/lib/index.js tests/lint-output/out/base
bash tests/lint-output/run.sh packages/cli/lib/index.js tests/lint-output/out/head
node tests/lint-output/compare.mjs tests/lint-output/out/base tests/lint-output/out/head tests/lint-output/out/report.md
```

## Add a spec

Add a download step and a `lint_cell` line in `run.sh`.
The cell name has the form `<API description>.<config>`.
