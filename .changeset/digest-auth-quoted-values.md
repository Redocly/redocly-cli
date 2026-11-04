---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` cut HTTP Digest challenge values that contain `=` or `,`, such as base64 nonces with padding.
