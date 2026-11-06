---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where a digest security scheme overrode the `Authorization` header set by a scheme described after it in `x-security`.
