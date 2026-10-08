---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed the `no-schema-type-mismatch` rule to report `properties` on any non-`object` type and `items` on any non-`array` type, such as `type: string` with `properties`.
Previously, the rule only reported `properties` on `array` and `items` on `object`.
**Note:** Because the rule is an error in the `recommended` ruleset, descriptions that passed before may now fail.
