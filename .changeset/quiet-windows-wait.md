---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed the usage telemetry of generated TypeScript clients to keep the counts of a failed send when the endpoint is unreachable or busy.
