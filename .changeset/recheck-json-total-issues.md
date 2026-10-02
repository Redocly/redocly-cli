---
'@redocly/cli': patch
---

Fixed the `json` format of the `recheck` command so that `totalIssues` and `breakdown` count every problem when `--max-problems` limits the listed issues.
