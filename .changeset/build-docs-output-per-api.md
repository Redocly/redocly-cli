---
'@redocly/cli': minor
---

Added the `docsOutput` option to the `apis` entries of the configuration file, so `build-docs` without an API builds the docs of every API.

**Warning:** `build-docs` without an API built the first API of the configuration file before. It now fails with `--output`, or when two APIs have no `docsOutput`, so pass the API to the command, or set `docsOutput` for each API.
