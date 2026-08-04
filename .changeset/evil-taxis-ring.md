---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Fixed the `struct` rule to report unexpected fields on AsyncAPI 3 messages and message traits.
Previously any field was accepted, and the linter skipped everything nested under an unexpected field.
Added the missing `deprecated` field to both objects.

**Note**: linting output may include new `struct` errors for AsyncAPI 3 descriptions with fields that are not part of the Message Object.
