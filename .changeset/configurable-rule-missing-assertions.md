---
'@redocly/openapi-core': patch
---

Fixed the unclear error raised when a configurable rule, or one of its `where` entries, is missing the `assertions` block. The message now names the rule instead of failing with `Cannot read properties of undefined (reading 'pattern')`. This covers both the OpenAPI and the GraphQL paths.
