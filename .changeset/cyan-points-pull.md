---
"@redocly/openapi-core": patch
---

Fixed an issue where the `ignoreLastPathSegment` option of the `path-segment-plural` rule had no effect if the path contained only one segment, resulting in an error.
