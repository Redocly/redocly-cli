---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `bundle` command rewrote internal `$ref`s pointing to other `$ref`s.
The issue caused AsyncAPI 3 operation `messages` references to point to `components` instead of channel messages.
