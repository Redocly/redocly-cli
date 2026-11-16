---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` reported a valid decimal value, such as `98.8` for `multipleOf: 0.1`, in a response or in workflow inputs.
