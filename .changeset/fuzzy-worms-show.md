---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed the `no-invalid-parameter-examples` and `no-invalid-schema-examples` rules to consistently pass `allowAdditionalProperties` when creating the AJV instance for both single and multi examples.
