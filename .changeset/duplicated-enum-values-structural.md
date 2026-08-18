---
'@redocly/openapi-core': patch
---

Fixed the `no-duplicated-enum-values` rule missing duplicated enum values that are objects or arrays, and printing `[object Object]` when it did report one.
