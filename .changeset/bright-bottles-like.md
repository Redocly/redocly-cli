---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed `respect` so string values read through a JSON pointer, such as `$response.body#/token`, are no longer rewritten when they contain a dot followed by a digit.
