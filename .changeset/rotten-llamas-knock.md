---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue where the `no-required-schema-properties-undefined` caused a crash when encountering unresolved `$ref`s.
