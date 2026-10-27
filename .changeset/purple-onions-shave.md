---
'@redocly/cli': minor
'@redocly/openapi-core': minor
---

Added an experimental `diff` command that compares two API descriptions, reports changes, and rates every change by the semver bump it requires (`patch`, `minor`, or `major`).
`--fail-on` sets the impact that fails the run and `--check-version` verifies that `info.version` was bumped accordingly.
