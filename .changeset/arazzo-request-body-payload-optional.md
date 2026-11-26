---
'@redocly/openapi-core': patch
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `struct` rule reported an Arazzo request body that had no `payload`, even though the field was optional.
