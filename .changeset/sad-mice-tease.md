---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed the `path-parameters-defined` rule to report an error at the `$ref` location instead of at the component definition when a path parameter is referenced via `$ref` but not used in the path.
