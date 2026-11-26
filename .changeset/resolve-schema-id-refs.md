---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed `$ref` resolution inside schemas that define `$id`, resolving local `#/$defs` pointers and relative URI references against the enclosing schema's `$id` and matching in-document `$id` schema resources.
