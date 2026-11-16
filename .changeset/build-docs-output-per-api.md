---
'@redocly/cli': minor
---

Added the `docsOutput` option to the `apis` entries of the configuration file, so `build-docs` without an API builds the docs of every API that has it.

**Warning:** building the first API of the configuration file, as `build-docs` without an API did before, is deprecated, and a later release removes it. Pass the API to the command, or set `docsOutput` for each API.
Applying the settings of an API to a file path that is its `root` is deprecated too. Pass the alias of the API to keep its settings.
