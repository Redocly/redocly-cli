---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where example validation reported a decimal value, such as `98.8`, as not a multiple of a decimal `multipleOf`, such as `0.1`.
