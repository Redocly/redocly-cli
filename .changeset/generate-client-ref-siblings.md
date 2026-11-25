---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the `generate-client` command dropped the keywords next to a schema `$ref`.
The generated types and schemas combine those keywords, such as `properties`, `required`, and `description`, with the referenced schema.
