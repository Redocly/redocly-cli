---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where `bundle` created a duplicate component named after the file when a named component referenced an external file with a different name or casing (for example, `ApiRequest: { $ref: ./apiRequest.yaml }`).
The bundled output now keeps the authored component name and points all references to it.
