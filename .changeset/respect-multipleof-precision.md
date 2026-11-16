---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` failed the schema check for a valid decimal value, such as `98.8` for `multipleOf: 0.1`.
