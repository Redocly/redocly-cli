---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where `bundle` created a duplicate component named after the referenced file instead of reusing the authored component name.

**Note**: for API descriptions affected by this bug, component names in the bundled output change — references now point to the authored component name instead of a file-derived duplicate.
