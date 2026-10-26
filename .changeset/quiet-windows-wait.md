---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed the usage telemetry of generated TypeScript clients so that a send that fails on a connection error, `408`, `429`, or `5xx` keeps its counts for the next window, and a send that times out or gets another `4xx` drops them.
