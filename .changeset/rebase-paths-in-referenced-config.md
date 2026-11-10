---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Relative file paths in a config file included with `$ref` are now resolved from that file instead of from the root `redocly.yaml`.

**Note:** if a referenced config file has paths written relative to the root `redocly.yaml`, rewrite them relative to that file.
