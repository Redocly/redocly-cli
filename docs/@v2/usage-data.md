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
- whether the user is logged into Redocly
- values from `REDOCLY_ENVIRONMENT`, `REDOCLY_CLI_TELEMETRY_METADATA`, and `CI` environment variables
- CLI version
- Node.js and NPM versions
- whether the `redocly.yaml` configuration file exists
- API specification type and version
- Arazzo x-security authentication types
- platform (Linux, macOS, Windows)
- anonymous ID (a randomly generated identifier that doesn't contain personal information)
- command execution time
- whether the CLI runs from a released build or development build

Values such as file names, organization IDs, and URLs are removed, replaced by just "URL" or "file", etc.

## Opt out of data collection

To opt out, set the `REDOCLY_TELEMETRY` environment variable to `off`, or set `telemetry: off` in the `redocly.yaml` configuration file.
