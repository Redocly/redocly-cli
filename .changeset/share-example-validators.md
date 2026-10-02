---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Improved performance of the `no-invalid-media-type-examples`, `no-invalid-schema-examples`, and `no-invalid-parameter-examples` rules by reusing validators for schemas that are referenced or repeated.
