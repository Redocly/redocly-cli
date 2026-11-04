---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Added support for the `description` field of the Media Type Object, which OpenAPI 3.2 adds in https://github.com/OAI/OpenAPI-Specification/pull/5584.
The `lint` command no longer reports it as an error in OpenAPI 3.2 descriptions.
