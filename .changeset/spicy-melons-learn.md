---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue where the `no-invalid-media-type-examples` rule did not respect `readOnly` and `writeOnly` properties in schemas.
