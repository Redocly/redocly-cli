---
'@redocly/openapi-core': patch
---

Fixed an issue where a config file that uses plugin presets or plugin assertion functions could not be loaded when its plugins were not evaluated, which is the case in the browser and with `skipPluginEval`. Such presets and rules are now skipped with a warning.
