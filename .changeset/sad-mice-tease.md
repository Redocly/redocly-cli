---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed the `path-parameters-defined` rule to report an error at the actual error location (the parameter definition) and provide additional context via the `from` field when a path parameter is referenced via `$ref` but not used in the path.
