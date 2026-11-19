---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` reported `Invalid JSON Pointer` for a valid replacement `target` when the replacement `value` could not be evaluated.
The step fails with the error of the value.
