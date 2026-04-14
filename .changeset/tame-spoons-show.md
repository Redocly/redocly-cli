---
"@redocly/openapi-core": minor
---

Moved the `remove-unused-components` decorator to a post-bundle phase so that components that become unused only after `$ref` resolution are correctly removed.
