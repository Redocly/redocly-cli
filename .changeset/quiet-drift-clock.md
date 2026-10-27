---
'@redocly/cli': patch
---

Updated the experimental `drift` command to print its execution time after the report, the same as other commands.
The `drift` and `proxy` reports no longer include the duration, and the JSON report no longer has the `run.durationMs` field.
