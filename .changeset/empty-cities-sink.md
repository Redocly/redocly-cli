---
"@redocly/cli": patch
---

Fixed `lint --format=checkstyle` to produce a single combined XML document when multiple APIs are passed to the command, instead of concatenated per-file documents.
