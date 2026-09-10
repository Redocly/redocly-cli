---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `no-required-schema-properties-undefined` rule incorrectly reported properties required inside a `not` subschema as undefined.
