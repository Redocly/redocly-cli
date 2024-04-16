---
"@redocly/openapi-core": patch
---

Changed the `loadConfig` function to avoid overwriting the `externalRefResolver` internally. That improves caching external config resources.
