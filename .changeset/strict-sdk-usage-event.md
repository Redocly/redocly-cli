---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Changed the usage telemetry event of the generated clients to the `com.redocly.sdkUsage.aggregated` CloudEvent.
**Note:** A custom `sink` reads the counts and the SDK from the two items of `data` instead of `data.usage` and `data.sdk`.
