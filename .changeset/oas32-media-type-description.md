---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Added the `description` field of the Media Type Object, which OpenAPI 3.2.1 defines, so that `lint` no longer reports it in OpenAPI 3.2 descriptions.
