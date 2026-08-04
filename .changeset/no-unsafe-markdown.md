---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added the `no-unsafe-markdown` rule that disallows potentially executable content in `description` fields.
The rule is enabled at the `warn` level in the `recommended` ruleset.

**Note**: linting output may include new warnings for `description` fields that contain potentially executable content.
