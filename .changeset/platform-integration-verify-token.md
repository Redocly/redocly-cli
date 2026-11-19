---
'@redocly/platform-integration': minor
---

Changed the return value of `RedoclyOAuthDeviceFlow.verifyToken` from a boolean to `'valid'`, `'expired'`, or `'unreachable'`.
If you call `verifyToken`, check for `'valid'` instead of `true`.
