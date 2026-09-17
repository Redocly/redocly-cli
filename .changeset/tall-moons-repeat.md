---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed `respect` so a same-workflow `goto` no longer cleared `$steps` outputs from steps that already ran.
Previously, this broke $steps expressions in the target step.
