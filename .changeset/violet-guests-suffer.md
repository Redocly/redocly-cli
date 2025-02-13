---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue where the `no-invalid-media-type-examples` rule crashed instead of reporting an error when it failed to resolve an example from a $ref.
