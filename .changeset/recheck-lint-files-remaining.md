---
'@redocly/recheck': patch
---

Fixed `lintFiles` and `runRulesUntilStable` so that, with `fix`, they return the problems that remain in the fixed content.
**Note:** Before, they returned the problems found before fixing; to get those, lint without `fix` first.
