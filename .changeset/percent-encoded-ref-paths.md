---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where a local `$ref` with percent-encoded characters, such as `paths/users_%7Bid%7D.yaml`, could not be resolved.
