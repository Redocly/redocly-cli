---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed a false positive in the `no-required-schema-properties-undefined` rule by skipping `required` lists inside `not`.
