---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where `lint` reported Media Type Objects under `components.mediaTypes` in OpenAPI 3.2 descriptions as invalid.
A `$ref` to such an object now goes in a `content` entry, as the specification defines.
