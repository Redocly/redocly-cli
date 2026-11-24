---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `no-required-schema-properties-undefined` rule reported a required property defined in an `allOf` sibling when the schema was reached through a `oneOf` or `anyOf`.
