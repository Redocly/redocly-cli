---
'@redocly/openapi-core': minor
---

Added `security-defined` rule for AsyncAPI 2.x and 3.x.

**Warning**: this rule is enabled at `error` severity in the `recommended` ruleset, so AsyncAPI documents that previously linted clean may now fail. The rule flags security `$ref`s that target an undefined scheme or a path outside `components.securitySchemes`, and operations that declare no `security` of their own when the applicable servers don't supply one either.
