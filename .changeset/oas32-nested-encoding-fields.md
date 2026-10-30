---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where `lint` reported the `encoding`, `prefixEncoding`, and `itemEncoding` fields of a nested Encoding Object in OpenAPI 3.2 descriptions as invalid.
The `spec-no-invalid-encoding-combinations` rule now also checks nested Encoding Objects.
