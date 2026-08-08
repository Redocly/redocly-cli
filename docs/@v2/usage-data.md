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
- names of lint rules that reported errors, warnings, or ignored problems
- Arazzo x-security authentication types
- for `generate-client`: which built-in generators ran, the count of custom generators, which of the package's own exported helper names a custom generator imports, and a coarse error category on failure.
  When a path-loaded generator carries the `eject-generator` provenance header, its built-in origin and the version it was ejected from are included (for example `php@0.2.0`) — the file's contents, path, and any user-chosen names are never transmitted.
- for `eject-generator`: the action (`eject`, `update`, `guidance`), the built-in generator name, and a coarse outcome category (such as `success`, `conflicts` with the conflict count, `already-exists`, or `merge-tool-missing`).
  Custom generator file contents, paths, and names are never collected.
- platform (Linux, macOS, Windows)
- anonymous ID (a randomly generated identifier that doesn't contain personal information)
- command execution time
- whether the CLI runs from a released build or development build

Values such as file names, organization IDs, and URLs are removed, replaced by just "URL" or "file", etc.

## Opt out of data collection

To opt out, set the `REDOCLY_TELEMETRY` environment variable to `off`, or set `telemetry: off` in the `redocly.yaml` configuration file.
