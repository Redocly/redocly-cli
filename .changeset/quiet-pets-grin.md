---
'@redocly/openapi-core': patch
---

Fixed an issue in bundling where strings with numeric characters and underscores (e.g. `'12_34'`) were emitted unquoted.
These strings could then be read back as numbers by YAML 1.1 parsers.
