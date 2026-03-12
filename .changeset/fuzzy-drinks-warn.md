---
'@redocly/cli': patch
---

Fixed an issue where `join --prefix-components-with-info-prop` would incorrectly rewrite discriminator mapping refs.
This issue occurred when schema names contained the same substring as the prefix.
