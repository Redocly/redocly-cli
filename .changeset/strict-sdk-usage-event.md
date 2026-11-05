---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Changed the usage telemetry event of the generated TypeScript, Go, Python, and PHP clients to the `com.redocly.sdkUsage.aggregated` CloudEvent, with the operation and its counts as the first item of `data` and the SDK as the second.
If you pass a custom `sink`, read the counts and the SDK from these items instead of `data.usage` and `data.sdk`.
