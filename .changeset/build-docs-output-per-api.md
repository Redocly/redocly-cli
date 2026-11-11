---
'@redocly/cli': minor
---

Added the `docsOutput` option to the `apis` entries of the configuration file, so `build-docs` without an API builds the docs of every API.

**Note:** `build-docs` without an API now fails with `--output`, or when two APIs of the configuration file have no `docsOutput`, where it built the first API before. Pass the API to the command, or set `docsOutput` for each API.
