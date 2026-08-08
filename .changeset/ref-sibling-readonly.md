---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed `readOnly` being ignored when it sits beside a `$ref` in an OpenAPI 3.1 description, which left server-computed properties in generated request bodies; in 3.0, where a `$ref` replaces the schema, generation now warns instead of dropping the keyword silently.
