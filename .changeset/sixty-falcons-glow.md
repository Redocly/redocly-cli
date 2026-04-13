---
"@redocly/respect-core": patch
---

Fix AJV validation error when response schemas use a discriminator property with complex constraint patterns like `allOf + not`. The AJV instance in `schema-checker` was configured with `discriminator: true`, which requires every discriminator property to have a direct `const` or `enum` — incompatible with fully-dereferenced schemas that use valid OpenAPI composition patterns. Setting `discriminator: false` means AJV validates `oneOf`/`anyOf` branches normally, preserving identical pass/fail semantics without the compile-time constraint.
