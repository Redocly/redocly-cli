---
seo:
  title: Usage data
---

# Usage data and product metrics

The Redocly CLI sends a small set of anonymized data to Redocly.
We use this data to understand how you use the tool and to improve it.

## What data is collected

When you run a command, the CLI collects this data:

- the command that you run
- the command exit code
- whether the user is logged in to Redocly
- the values of the `REDOCLY_ENVIRONMENT`, `REDOCLY_CLI_TELEMETRY_METADATA`, and `CI` environment variables
- the CLI version
- the Node.js and NPM versions
- whether the `redocly.yaml` configuration file exists
- the API specification type and version
- the names of the lint rules that report errors, warnings, or ignored problems
- the Arazzo x-security authentication types
- for `generate-client`:
  - the built-in generators that run
  - the count of custom generators
  - the names of the package's own exported helpers that a custom generator imports
  - the count of APIs that a composed CLI entry (`client.cliOutput`) spans
  - a coarse error category if the command fails
    If a path-loaded generator has the `eject-generator` provenance header, the CLI also sends the built-in origin and the version that the generator was ejected from (for example `php@0.2.0`).
    The CLI never sends the file contents, the file path, or names that the user chose.
- for `eject-generator`:
  - the action (`eject`, `update`, `guidance`)
  - the name of the built-in generator
  - a coarse outcome category (such as `success`, `conflicts` with the conflict count, `already-exists`, or `merge-tool-missing`)
    For an `--update` run, the CLI also sends the two `@redocly/client-generator` versions: the version that the file was ejected from, and the installed version.
    The CLI never collects the file contents, paths, or names of custom generators.
- the platform (Linux, macOS, Windows)
- an anonymous ID (a randomly generated identifier that contains no personal information)
- the command execution time
- whether the CLI runs from a released build or a development build

The CLI removes values such as file names, organization IDs, and URLs.
The CLI replaces these values with generic words such as "URL" or "file".

## Opt out of data collection

To opt out, set the `REDOCLY_TELEMETRY` environment variable to `off`, or set `telemetry: off` in the `redocly.yaml` configuration file.
