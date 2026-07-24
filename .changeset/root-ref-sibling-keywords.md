---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed the `bundle` command losing schema keywords (such as `title`, `properties`, or `required`) written next to a `$ref` when the referenced schema starts with its own `$ref`.
