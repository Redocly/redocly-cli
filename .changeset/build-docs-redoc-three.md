---
'@redocly/cli': minor
---

Updated the `build-docs` command to Redoc 3 and added support for AsyncAPI descriptions and GraphQL schemas.
Added the `--openapi`, `--asyncapi`, `--graphql`, `--inlineBundle`, and `--disableTelemetry` options and deprecated `--theme.openapi`.
The generated page keeps Redoc telemetry off when Redocly CLI usage data is turned off with `REDOCLY_TELEMETRY=off` or `telemetry: off`.

**Note**: Redoc 3 renamed or removed some Redoc 2 configuration options, so existing `theme.openapi` settings may need updating.
