---
'@redocly/cli': minor
---

**Breaking**: Changed the `build-docs` command without an API to build the docs of every API of the configuration file, and added the `docsOutput` option to the `apis` entries to set the file of each build.

**Warning:** `build-docs` without an API fails with `--output`, or when two APIs of the configuration file have no `docsOutput`, where it built the first API before. Pass the API to the command, or set `docsOutput` for each API.
