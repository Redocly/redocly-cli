---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed resolving $refs. Previously, it was failing to correctly resolve file names that contain the hash symbol.
