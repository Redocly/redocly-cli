---
'@redocly/cli': minor
---

Added the `docsOutput` option to the `apis` entries of the configuration file, and changed `build-docs` without an API to build the docs of every API.

**Warning:** building only the first API of the configuration file is deprecated. `build-docs` without an API still does it for a configuration file without `docsOutput`, and prints a deprecation banner. A later release removes it, so pass the API to the command, or set `docsOutput` for each API.
