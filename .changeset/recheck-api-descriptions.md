---
'@redocly/cli': minor
'@redocly/recheck': minor
---

Improved `redocly recheck` to lint the `description` fields of API descriptions.
Findings report the source line and column.
You can suppress the findings by file, rule, and pointer, or adjust rules for descriptions only.

**Note:** `ResolvedRecheckConfig` gains a required `descriptionRules` field.
Library code that builds that object by hand must set it.
