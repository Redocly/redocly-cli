---
'@redocly/openapi-core': patch
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `struct` rule didn't report an empty `successCriteria` list of an Arazzo step or an empty `criteria` list of a success action.

**Note:** Because `struct` is an error in every ruleset, a description with one of these empty lists now fails `lint` and stops a Respect run.
Add at least one criterion to the list, or remove the field.
