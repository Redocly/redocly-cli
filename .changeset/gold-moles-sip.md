---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed the `remove-unused-components` decorator to remove unused components containing `allOf` keyword.

> **Note:** The bundler may now remove more unused components than before.
