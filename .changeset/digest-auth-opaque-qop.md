---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` failed HTTP Digest authentication when the server's `WWW-Authenticate` header had no `opaque` parameter.
