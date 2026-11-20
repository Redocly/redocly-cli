---
'@redocly/cli': patch
---

Fixed an issue where the `drift` and `proxy` commands checked a value against a recursive schema only down to the first level of recursion, so a mismatch below it was not reported.
The commands now check a recursive schema at every level.
