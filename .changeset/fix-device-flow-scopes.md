---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where `lint` and `bundle` crashed with `Unknown type name found: string` on OpenAPI 3.2 descriptions that had a `deviceAuthorization` OAuth flow with non-empty `scopes`.
