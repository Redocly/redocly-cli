---
'@redocly/cli': patch
---

Fixed an issue where `drift` reported a valid decimal value, such as `98.8` for `multipleOf: 0.1`, as a schema mismatch.
