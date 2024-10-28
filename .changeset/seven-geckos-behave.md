---
"@redocly/openapi-core": patch
"@redocly/cli": patch
---

Fixed the `remove-x-internal` decorator, which was not removing the reference in the corresponding discriminator mapping while removing the original `$ref`.
