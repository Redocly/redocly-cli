---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the generated TypeScript client lost usage telemetry counts when the telemetry endpoint was unreachable or returned a `408`, `429`, or `5xx` status.
The client adds these counts to the next send.

