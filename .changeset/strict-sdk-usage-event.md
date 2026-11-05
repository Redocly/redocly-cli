---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Changed the usage telemetry event of the generated clients to the CloudEvent schema of the other Redocly CLI events.
**Note:** A custom `sink` reads the operation from `data[0]` and the SDK from `data[1]` instead of `data.usage` and `data.sdk`, and reads `id` instead of `operation_id`, `name`, and `source`.
