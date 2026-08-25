---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `bundle` command didn't resolve `$ref`s inside an AsyncAPI 3 Multi Format Schema Object.
