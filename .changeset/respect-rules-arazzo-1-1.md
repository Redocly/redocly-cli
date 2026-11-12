---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` did not apply its own lint rules, such as `no-criteria-xpath` and the `x-security` rules, to Arazzo 1.1.0 descriptions.
