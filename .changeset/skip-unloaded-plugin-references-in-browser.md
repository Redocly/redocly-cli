---
'@redocly/openapi-core': patch
---

Fixed an issue where a config file that uses plugin presets or plugin assertion functions failed to load in the browser, where plugins from a config file are not evaluated. Such presets, rules and decorators are now skipped with a warning.
