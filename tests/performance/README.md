# Historical versions benchmark

Automated benchmark testing that compares the performance of **Redocly CLI** versions. It runs in CI on pull requests.

## Adding a version after a release

After releasing a new version, add it to `_enhancedDependencies` in [package.json](./package.json) for historical reference; it is benchmarked only on opt-in runs (see [Which versions get benchmarked](#which-versions-get-benchmarked)).

## Which versions get benchmarked

Two version sets live in [package.json](./package.json):

- `dependencies` — benchmarked on **every** run. Kept minimal (`cli-latest` and `cli-next`) so regular PRs get a fast latest-vs-next comparison.
- `_enhancedDependencies` — the full historical matrix, benchmarked only on opt-in runs.

The [performance workflow](../../.github/workflows/performance.yaml) promotes `_enhancedDependencies` into `dependencies` (overwriting it) only on the release PR (`changeset-release/main`) or on any PR carrying the `performance-benchmark` label. This keeps the deep-dive across many versions off the normal PR path while leaving it a single label away.

## Scripts

- `npm run make-test` — reads the `dependencies` keys and generates the `test:bundle` / `test:lint` / `test:check-config` hyperfine commands into `package.json` (overwriting the committed placeholders by design).
- `npm test` — runs the three generated benchmarks, exporting `benchmark_<op>.md` / `.json`.
- `npm run chart` — renders the combined comparison table (`benchmark_chart.md`) from the JSON exports.
