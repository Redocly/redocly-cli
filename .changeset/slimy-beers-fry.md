---
'@redocly/respect-core': patch
---

Fixed a code execution vulnerability where a crafted `$faker` expression in an Arazzo description could execute arbitrary JavaScript during Redocly Respect runs.
