---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the `generate-client` command typed a schema as `unknown` when its `$ref` pointed at a schema that was itself only a `$ref`.
