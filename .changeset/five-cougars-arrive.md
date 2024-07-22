---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue in the OpenAPI `spec` rule where `dependentSchemas` was parsed as an array.
It is now correctly parsed as a map. 
