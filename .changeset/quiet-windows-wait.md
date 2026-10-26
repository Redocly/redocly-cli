---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed the usage telemetry of generated TypeScript clients so that a send that fails or gets a non-`2xx` response keeps its counts for the next window instead of losing them.
