---
'@redocly/respect-core': minor
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added OAuth2 token exchange for `x-security` schemes with the `password` and `clientCredentials` flows. Respect will fetch the access token from `tokenUrl` and apply `Authorization: Bearer` to the request, which allows to  manually obtain a `accessToken`. The `x-security-scheme-required-values` rule now validates the credentials required by the declared flow. Pre-fetched `accessToken` values continue to work.
