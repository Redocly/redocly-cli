---
"@redocly/openapi-core": patch
---

Fixed an issue where the `remove-unused-components` decorator was failing to resolve `$ref` references to schemas from `components`.
