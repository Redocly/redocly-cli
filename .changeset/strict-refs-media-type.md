---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed the `spec-strict-refs` rule so that it no longer reports a `$ref` to a Media Type Object in a `content` entry of OpenAPI 3.2 descriptions.
