---
'@redocly/cli': minor
'@redocly/openapi-core': minor
---

Added an experimental `diff` command that compares two API descriptions, reports what was added, removed, and modified, and rates every change by the semver bump it requires (`patch`, `minor`, or `major`). `--fail-on` sets the impact that fails the run and `--check-version` verifies that `info.version` was bumped accordingly.

Configure the impact per rule in `redocly.yaml` with `extends: [recommended-diff]` and a `diff` block, for example `diff: { operation-removed: minor }`. A `oas3_0Diff`, `oas3_1Diff`, `oas3_2Diff` or `async3Diff` block sets the impact for one specification, the way the per-specification rule blocks work for `lint`. `--skip-rule` turns a rule off for a single run.
