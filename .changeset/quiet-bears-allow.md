---
'@redocly/cli': patch
'@redocly/openapi-core': patch
---

Fixed an issue where rule reported a duplicate parameter when two or more `$ref`s point to the same path item.
