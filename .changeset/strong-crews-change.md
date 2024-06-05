---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed `no-invalid-media-type-examples`, `no-invalid-parameter-examples`, and `no-invalid-schema-examples` rules which allowed falsy example values to pass for any schema.
