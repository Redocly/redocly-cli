---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect could take a long time to evaluate a string with many unclosed `$faker` calls.
