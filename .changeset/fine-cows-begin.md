---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed the `no-required-schema-properties-undefined` rule to report when a required property is not defined in every `oneOf`/`anyOf` branch.
