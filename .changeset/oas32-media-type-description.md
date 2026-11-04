---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Added support for the `description` field of the Media Type Object, which the next patch release of OpenAPI 3.2 adds.
The `lint` command no longer reports it as an error in OpenAPI 3.2 descriptions.
