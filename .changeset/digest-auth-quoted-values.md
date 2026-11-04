---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` failed HTTP Digest authentication when a value in the server's `WWW-Authenticate` header contained `=` or `,`, such as a base64 nonce with padding.
