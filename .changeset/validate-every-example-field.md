---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `no-invalid-media-type-examples` and `no-invalid-parameter-examples` rules skipped an example's `value` when the OpenAPI 3.2 `dataValue` field was also present.
Both fields are now validated against the schema, each at its own location.
