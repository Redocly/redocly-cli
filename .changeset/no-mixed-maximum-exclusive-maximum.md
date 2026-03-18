---
"@redocly/cli": minor
"@redocly/openapi-core": minor
---

Added `no-mixed-maximum-and-exclusive-maximum` rule for OpenAPI `3.1`.
This rule warns when schemas use both `maximum` and `exclusiveMaximum` or both `minimum` and `exclusiveMinimum` keywords.
