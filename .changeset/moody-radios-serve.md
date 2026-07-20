---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `bundle` command rewrote internal `$ref`s pointing to other `$ref`s, which made AsyncAPI 3 operation `messages` refs point to `components` instead of channel messages.
