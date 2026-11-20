---
'@redocly/respect-core': minor
'@redocly/cli': minor
---

Added `format` validation to the response schema checks in Respect, using the same formats as the lint rules. For example, a response value with `format: date-time` that is not a valid date-time now fails the schema check.
