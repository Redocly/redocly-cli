---
'@redocly/client-generator': patch
'@redocly/cli': patch
---

Fixed an issue where the generated PHP and Python clients failed when a discriminator mapping pointed to a schema that is itself a `oneOf`.
