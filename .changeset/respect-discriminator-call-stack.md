---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` threw `Maximum call stack size exceeded` when validating schemas with large lists of discriminator variants or enum values.
