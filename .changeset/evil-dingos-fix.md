---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Changed the severity of the `security-defined` rule for AsyncAPI 2.x and 3.x in the `recommended` ruleset from `error` to `warn`.
AsyncAPI descriptions with undefined or unresolved security no longer fail linting by default.
