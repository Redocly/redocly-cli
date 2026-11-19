---
'@redocly/cli': patch
'@redocly/platform-integration': patch
---

Fixed commands that reported you as logged out when another Redocly CLI or editor process refreshed the same login session at the same time.
A refreshed session is now also used when the credentials file can't be updated.
