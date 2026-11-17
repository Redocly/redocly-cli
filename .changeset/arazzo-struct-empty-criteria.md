---
'@redocly/openapi-core': patch
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `struct` rule didn't report an empty `successCriteria` list of an Arazzo step or an empty `criteria` list of a success action.
