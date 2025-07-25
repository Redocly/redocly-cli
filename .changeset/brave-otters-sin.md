---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue where the `no-required-schema-properties-undefined` rule incorrectly resolved nested `$ref`s relative to the file in which they were defined.
