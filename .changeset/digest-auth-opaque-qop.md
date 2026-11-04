---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` failed HTTP Digest authentication when the server did not send `opaque` or offered several `qop` values.
