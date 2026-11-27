---
'@redocly/cli': minor
'@redocly/recheck': minor
---

Recheck stores API description suppressions as JSON pointers in its baseline.
`.redocly.lint-ignore.yaml` no longer suppresses Recheck findings.

**Note:** Move Recheck error suppressions from `.redocly.lint-ignore.yaml` to `.redocly.recheck-baseline.yaml` under the source file and full rule name.
Previously suppressed warnings and info findings reappear.
Upgrade all Recheck runners before generating pointers because older versions reject them.
