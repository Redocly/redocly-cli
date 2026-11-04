---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the generated PHP client threw a `TypeError` on a response with a `oneOf` or `anyOf` value without a discriminator.
