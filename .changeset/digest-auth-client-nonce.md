---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` sent `cnonce="undefined"` in the HTTP Digest `Authorization` header instead of a generated client nonce.
