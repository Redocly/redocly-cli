---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue where files specified in the `info-description-override` decorator were not always resolved correctly.
The resolution logic now properly locates the specified files relative to the config file.
