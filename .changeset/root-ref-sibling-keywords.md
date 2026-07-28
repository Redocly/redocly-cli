---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Fixed the `bundle` command losing schema keywords (such as `title`, `properties`, or `required`) written next to a `$ref` when the referenced schemas started with their own `$ref`.
