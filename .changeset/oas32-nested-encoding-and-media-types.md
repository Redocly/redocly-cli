---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where `lint` reported the `components.mediaTypes` entries and the nested `encoding`, `prefixEncoding`, and `itemEncoding` fields of an Encoding Object as errors on OpenAPI 3.2 descriptions.
The `spec-no-invalid-encoding-combinations` rule now also checks nested Encoding Objects.

**Note:** `components.mediaTypes` now holds Media Type Objects, as the OpenAPI 3.2 specification defines them, so `bundle`, `no-unused-components`, and `remove-unused-components` treat a `$ref` to it from a `content` entry, not from the whole `content` map.
