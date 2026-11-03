---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added usage telemetry and the `onSettled` hook to the generated Go, Python, and PHP clients.
Renamed a schema named `UsageTelemetry`, `UsageTelemetryOptions`, `UsageTelemetryEvent`, `NewUsageTelemetry`, or `FlushUsageTelemetry` in every generated client, for example to `UsageTelemetry_2`, so that it does not clash with the usage telemetry code.
If your code uses one of these generated types, update its name.
