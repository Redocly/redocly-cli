---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue where the content of `$ref`s inside example values was erroneously resolved during bundling and linting.
