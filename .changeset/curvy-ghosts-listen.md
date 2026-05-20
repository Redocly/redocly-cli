---
'@redocly/cli': patch
---

Fixed the `join` command to apply root-level `security` from each joined API to operations that do not define their own `security`.
