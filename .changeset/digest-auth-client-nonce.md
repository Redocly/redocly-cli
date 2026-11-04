---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` sent `cnonce="undefined"` in every HTTP Digest `Authorization` header instead of a random client nonce.
