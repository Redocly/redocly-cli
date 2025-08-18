---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed an issue where files specified in decorators parameters were not always resolved correctly.
The resolution logic now properly locates the specified files relative to the config file for `info-description-override`, `media-type-examples-override`, `operation-description-override`, and `tag-description-override` decorators.
