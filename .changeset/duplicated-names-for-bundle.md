---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where `bundle` created a duplicate component named after the referenced file instead of reusing the authored component name.
