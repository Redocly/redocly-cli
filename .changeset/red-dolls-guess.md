---
"@redocly/openapi-core": patch
---

Fixed validation of examples where combining `required` with `readOnly` or `writeOnly` properties would incorrectly generate warnings.
