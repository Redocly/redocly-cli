---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Relative file paths in a config file included with `$ref` are now resolved from that file instead of from the root `redocly.yaml`.

**Note:** If a referenced config file is in another folder than the root `redocly.yaml`, rewrite its paths relative to that file.
Otherwise the files of `output`, `clientOutput` and `client.cliOutput` are written to another folder without an error.
