---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed bundling with the `--dereferenced` option. Previously, references to external files were not substituted with references to components, causing them to become invalid.
