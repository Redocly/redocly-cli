---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Added support for the `~0` and `~1` escapes in JSON Pointers of `respect` runtime expressions, so a pointer can reach a key that contains `~` or `/`.
