---
'@redocly/openapi-core': patch
---

Fixed `skipPluginEval` to keep `extends` unresolved instead of failing when the config extends a plugin preset.
