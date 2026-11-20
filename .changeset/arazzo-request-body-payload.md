---
'@redocly/openapi-core': patch
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `struct` rule reported an Arazzo request body without a `payload`.
The Arazzo specification does not require the `payload` field.
