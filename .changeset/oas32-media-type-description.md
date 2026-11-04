---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Added support for the `description` field of the Media Type Object, defined in OpenAPI 3.2.1.
The `lint` command no longer reports it as an error in OpenAPI 3.2 descriptions.
