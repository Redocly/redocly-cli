---
'@redocly/openapi-core': patch
---

Fixed an issue where the `no-duplicated-enum-values` rule didn't report duplicated enum values that are objects or arrays.

Fixed an issue where the `no-duplicated-enum-values` rule printed `[object Object]` when reporting duplicate values.
