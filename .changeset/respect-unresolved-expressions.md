---
'@redocly/cli': patch
'@redocly/respect-core': patch
---

Fixed `respect` so a step fails with a clear error when a runtime expression embedded in a string, such as `Bearer {$outputs.accessToken}`, has no value.
