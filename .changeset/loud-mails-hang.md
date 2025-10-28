---
"@redocly/openapi-core": patch
---

Fixed an issue where the content of `$ref`s inside `Examples.value` was erroneously resolved during bundling and linting.
