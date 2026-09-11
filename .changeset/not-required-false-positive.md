---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed a false positive in the `no-required-schema-properties-undefined` rule when `required` is used inside `not`.
