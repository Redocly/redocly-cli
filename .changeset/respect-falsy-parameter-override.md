---
'@redocly/cli': patch
'@redocly/respect-core': patch
---

Fixed an issue where `respect` ignored a Reusable Object `value` override such as `false`, `0`, or an empty string, and used the value of the referenced parameter instead.
