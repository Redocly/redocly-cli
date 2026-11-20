---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `remove-x-internal` decorator left security requirements that used a removed security scheme.
