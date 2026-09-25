---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added `const` checking to the `no-enum-type-mismatch` rule: a `const` value must now conform to the schema's `type`, the same way every `enum` value does.

**Note**: linting output may include new errors for schemas whose `const` value doesn't match their `type`.
