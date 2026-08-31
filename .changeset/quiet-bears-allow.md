---
'@redocly/cli': patch
'@redocly/openapi-core': patch
---

Fixed an issue where rule incorrectly reported a duplicate parameter when two or more `$ref`s pointed to the same path item.
