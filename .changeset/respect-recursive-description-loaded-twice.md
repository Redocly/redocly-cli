---
'@redocly/openapi-core': patch
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect failed with the `Maximum call stack size exceeded` error when more than one Arazzo file in a run used the same OpenAPI description with a recursive schema.
