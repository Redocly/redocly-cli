---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Changed `respect` runtime expressions to read a backslash in a string literal as written, so `"a\nb"` no longer contains a newline.
