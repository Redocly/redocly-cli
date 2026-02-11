---
"@redocly/openapi-core": minor
"@redocly/cli": minor
---

Added `spec-querystring-parameters` rule (OpenAPI 3.2): enforces that `query` and `querystring` are not mixed in the same operation/path parameter set, and that at most one `querystring` parameter is declared per operation or path.
