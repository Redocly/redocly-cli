---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the TypeScript usage telemetry counted 0 attempts for a call aborted before its first attempt, so an event had fewer attempts than calls.
