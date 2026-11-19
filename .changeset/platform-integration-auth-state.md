---
'@redocly/platform-integration': minor
---

Added the `getAuthState` method to `RedoclyOAuthClient` to report why a stored session can't be used, such as an expired session or an unreachable platform.
The client also accepts a custom credentials store and a function that opens the browser during device login; the login stops when that function resolves to `false`.
