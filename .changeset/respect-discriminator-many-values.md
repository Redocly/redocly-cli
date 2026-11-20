---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where the Respect schema check failed with the `Ajv error: Maximum call stack size exceeded` message when a response schema had a discriminator with many values.
