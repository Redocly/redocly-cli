---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed the `remove-unused-components` decorator to remove unused security schemes.

**Warning:** The bundler may now remove more unused components than before.
