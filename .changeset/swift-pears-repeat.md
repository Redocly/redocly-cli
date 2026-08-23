---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where `no-enum-type-mismatch` dropped violations and reported the wrong location when `type` was written as an array.
