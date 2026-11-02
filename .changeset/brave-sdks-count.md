---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added usage telemetry and the `onSettled` hook to the generated Go, Python, and PHP clients.
A schema named `UsageTelemetry`, `UsageTelemetryOptions`, `UsageTelemetryEvent`, or `NewUsageTelemetry` is now renamed in every generated client, for example to `UsageTelemetry_2`.
