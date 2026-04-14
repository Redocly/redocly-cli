---
"@redocly/openapi-core": minor
"@redocly/cli": minor
---

Moved the `remove-unused-components` decorator to the post-bundle phase so that components that become unused only after `$ref` resolution are correctly removed.
