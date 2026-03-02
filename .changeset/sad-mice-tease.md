---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fix `path-parameters-defined` rule to report error at `$ref` location instead of component definition when path parameter is referenced via `$ref` but not used in path
