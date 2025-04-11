---
seo:
  title: Usage data
---

# Usage data and product metrics

Redocly CLI sends a small set of anonymized data to help us understand how the tool is used and improve it.

## What data is collected

When a command is run, the following data is collected:

- the command being run
- command exit code
- values from `REDOCLY_ENVIRONMENT` and `REDOCLY_CLI_TELEMETRY_METADATA`
- CLI version
- Node.js and NPM versions
- whether the `redocly.yaml` configuration file exists
- API specification version
- Platform (Linux, macOS, Windows)

Values such as file names, organization IDs, and URLs are removed, replaced by just "URL" or "file", etc.

## Opt out of data collection

To opt out, set the `REDOCLY_TELEMETRY` environment variable to `off`, or set `telemetry: off` in the `redocly.yaml` configuration file.
