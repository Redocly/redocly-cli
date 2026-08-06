---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added a `cli-docs` generator that writes the Markdown reference for the generated CLI — every command, flag, credential variable, and exit code — rendered from the same command table the CLI dispatches on.

An operation whose request body the CLI cannot build (multipart, url-encoded, binary) now says so in both its `--help` and its reference entry, instead of appearing runnable.
