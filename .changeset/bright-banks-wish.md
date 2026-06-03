---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added the `--use-titles-for-component-names` flag to the `bundle` command to derive Schema component names from each schema's `title` field. Bundling fails when a referenced schema has no usable `title` or two titles produce the same name.
