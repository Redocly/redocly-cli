---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added the `no-server-variables-empty-enum` rule to the `spec` ruleset for OpenAPI 3.1 and 3.2 descriptions, where the specification requires a non-empty `enum` that holds the `default` value.

**Note:** `lint` with `extends: [spec]` now reports a server variable with an empty `enum`, or with a `default` outside its `enum`, as an error in OpenAPI 3.1 and 3.2 descriptions.
