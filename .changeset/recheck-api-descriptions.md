---
'@redocly/cli': minor
'@redocly/recheck': minor
---

`redocly recheck` now lints the `description` fields of API descriptions.
Findings report the source line and column, `.redocly.lint-ignore.yaml` suppresses them by file, rule, and pointer, and the `apiDescriptions.rules` block adjusts rules for descriptions only.
