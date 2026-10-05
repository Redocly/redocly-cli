---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where relative file paths in a config file included with `$ref` were resolved against the root `redocly.yaml` instead of the file they are written in.
Config options defined with `patternProperties`, such as `catalog` and `catalogClassic`, are now validated against the config schema like the other options.
