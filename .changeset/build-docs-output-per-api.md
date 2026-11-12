---
'@redocly/cli': minor
---

Added the `docsOutput` option to the `apis` entries of the configuration file, and changed `build-docs` without an API to build the docs of every API.

**Warning:** building only the first API of the configuration file, as `build-docs` without an API did before, is deprecated, and a later release removes it. Pass the API to the command, or set `docsOutput` for each API.
