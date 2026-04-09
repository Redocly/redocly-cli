---
"@redocly/openapi-core": minor
---

Moved the `remove-unused-components` decorator to a post-bundle phase so that components that become unused only after `$ref` resolution are correctly removed.
Decorators can now be registered as post-bundle decorators via the `postBundleDecorators` field in the plugin definition.
