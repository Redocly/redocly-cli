---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed plugin loading breaking in consumers that bundle `@redocly/openapi-core` with webpack or rspack.
