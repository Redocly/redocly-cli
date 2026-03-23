---
"@redocly/cli": minor
"@redocly/openapi-core": minor
---

Added `no-mixed-number-range-constraints` rule for OpenAPI `3.1+`, as well as for AsyncAPI and Arazzo.
This rule warns when schemas use both `maximum` and `exclusiveMaximum` or both `minimum` and `exclusiveMinimum` keywords.
