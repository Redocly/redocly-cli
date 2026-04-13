---
"@redocly/respect-core": patch
"@redocly/openapi-core": patch
---

Fixed AJV validation error when schemas use a discriminator property with complex constraint patterns like `allOf + not`.AJV's `discriminator: true` option requires every discriminator property to have a direct `const` or `enum`, which is incompatible with valid OpenAPI schemas that use composition patterns. Disabled AJV's discriminator keyword in both the respect schema checker and lint example validation, and removed the silent error swallowing in `validateExample` that was skipping validation for schemas with discriminators.
