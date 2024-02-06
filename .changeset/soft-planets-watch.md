---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue where `$ref`s ending in `#` (instead of `#/`) would break the application.
