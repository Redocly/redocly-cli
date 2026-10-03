---
'@redocly/cli': patch
---

Fixed the `recheck` JSON report so that `totalIssues` and `breakdown` count every problem when `--max-problems` is set, instead of only the problems listed under `issues`.
