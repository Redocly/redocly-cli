---
'@redocly/openapi-core': patch
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `struct` rule didn't report an Arazzo criterion that has a `type` and no `context`.
