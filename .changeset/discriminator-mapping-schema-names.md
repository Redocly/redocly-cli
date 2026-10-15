---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `no-unresolved-refs` rule reported discriminator mapping values that are schema names (for example, `dog: Dog`) as unresolved references.
