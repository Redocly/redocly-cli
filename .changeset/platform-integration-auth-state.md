---
'@redocly/platform-integration': minor
---

Added `getAuthState` to `RedoclyOAuthClient`.
It tells why the stored session cannot be used: signed out, logged in to another residency, an invalid platform URL, an expired session, or the platform is not reachable.
`RedoclyOAuthClient` also accepts a custom `CredentialsStore`, and `login` accepts a function that opens the browser during the device login.
