---
'@redocly/openapi-core': minor
---

Added a `skipPluginEval` option to `loadConfig` that resolves plugin paths without importing or executing plugin code — the returned plugins contain only their `absolutePath`.
