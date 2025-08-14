---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue where files specified in the `info-description-override` decorator were not always resolved correctly.
The resolution logic now properly locates and loads the specified files relatively to the config file.
