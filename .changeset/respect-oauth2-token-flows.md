---
'@redocly/openapi-core': minor
'@redocly/respect-core': minor
'@redocly/cli': minor
---

Added support for the OAuth2 `clientCredentials` and `password` flows to the `x-security` extension in Respect.
Set `clientId` and `clientSecret`, or `username` and `password`, in `x-security.values`, and Respect requests the access token from the `tokenUrl` of the flow.
An optional `scope` value limits the scopes of the requested token, and an `accessToken` value is still sent as it is.
The `x-security-scheme-required-values` rule accepts the values of the flows that the scheme declares.
