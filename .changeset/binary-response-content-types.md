---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed generated clients to decode compressed archives (`application/gzip`, `application/zip`, `application/x-tar`), PDF, Office documents, audio, video and font responses as binary instead of attempting to parse them as JSON.
