---
"@redocly/respect-core": patch
---

Fix AJV validation error when using discriminator with complex constraint patterns like `allOf + not`. AJV's discriminator keyword requires `const` or `enum` at the top level of discriminator properties, but dereferenced OpenAPI schemas can have these values wrapped in `allOf` patterns. Added preprocessing to normalize discriminator property schemas before AJV validation by promoting `const`/`enum` to the top level while preserving the full `allOf` for validation semantics.
