---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added a new built-in rule `security-scopes-defined` that requires every scope used in a security requirement to be defined in the corresponding OAuth2 security scheme.
It supports OpenAPI 2.0/3.x and AsyncAPI 2.6/3.0, suggests the closest defined scope for typos, and has an opt-in `requireScopes` option that requires OAuth2 security requirements to list at least one scope.
