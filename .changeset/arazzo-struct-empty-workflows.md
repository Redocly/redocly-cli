---
'@redocly/openapi-core': patch
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `struct` rule didn't report an Arazzo description with an empty `workflows` list.

**Note:** Because `struct` is an error in every ruleset, a description with an empty `workflows` list now fails `lint` and stops a Respect run.
Add at least one workflow to the description.
