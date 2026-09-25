---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where generated clients attempted to parse compressed archives (`application/gzip`, `application/x-tar`), PDF files, Office documents, audio, video and font responses as JSON instead of decoding them as binary.
