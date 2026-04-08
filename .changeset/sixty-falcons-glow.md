---
"@redocly/respect-core": major
---

Fix AJV validation error when using discriminator with constraint patterns allOf + not . AJV with `discriminator: true` requires discriminator properties to have `const` or `enum` directly, but valid OpenAPI schemas can use `allOf + not` patterns. The schema check now strips discriminators before AJV validation which allows full dereferenced schemas with complex constraints to validate correctly while maintaining data validation semantics.
