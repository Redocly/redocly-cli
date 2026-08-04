---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added the `no-duplicated-enum-values` rule that requires all values in an `enum` to be unique.
The rule is enabled at the `warn` level in the `recommended` ruleset.

**Note**: linting output may include new warnings for API descriptions that contain duplicated enum values.
