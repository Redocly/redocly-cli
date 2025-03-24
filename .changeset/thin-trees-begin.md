---
"@redocly/respect-core": patch
"@redocly/cli": patch
---

Fixed schema validation to properly handle OpenAPI `anyOf` schemas when validating responses using Ajv. This improves validation accuracy for schemas that use `anyOf` to define multiple possible response shapes.
