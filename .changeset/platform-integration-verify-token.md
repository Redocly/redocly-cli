---
'@redocly/platform-integration': minor
---

Replaced `RedoclyOAuthDeviceFlow.verifyToken` with `getTokenStatus`, which returns `'valid'`, `'expired'`, or `'unreachable'` instead of a boolean.
If you call `verifyToken`, call `getTokenStatus` and check for `'valid'` instead of `true`.
