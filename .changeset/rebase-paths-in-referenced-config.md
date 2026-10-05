---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where relative file paths in a config file included with `$ref` were resolved against the root `redocly.yaml` instead of the file they are written in.
The `catalog` and `catalogClassic` options are now validated against the config schema like the other options.
