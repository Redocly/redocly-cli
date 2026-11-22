---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed the `no-required-schema-properties-undefined` rule to find a required property in an `allOf` sibling when the schema is reached through a `oneOf` or `anyOf`.
