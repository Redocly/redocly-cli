---
'@redocly/openapi-core': patch
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `struct` rule reported an Arazzo request body that has no `payload`, although the field is optional.
