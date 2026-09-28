---
'@redocly/cli': patch
'@redocly/respect-core': patch
---

Fixed `respect` so a step fails with a clear error when a runtime expression embedded in a string has no value, such as `Bearer {$outputs.accessToken}`.
