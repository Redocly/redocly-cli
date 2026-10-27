---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` ignored the `dataValue` field of OpenAPI 3.2 examples when a step took its parameters or request body from the API description.
