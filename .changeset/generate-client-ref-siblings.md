---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the `generate-client` command dropped the keywords next to a schema `$ref` in OpenAPI 3.1 and later descriptions.
The generated types and schemas combine the `properties`, `required`, `allOf`, `oneOf`, and `anyOf` next to a `$ref` with the referenced schema.
A schema in `components` that is only a `$ref` takes the `description` and `deprecated` written next to it.
