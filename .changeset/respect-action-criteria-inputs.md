---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `criteria` of a success or failure action in `respect` could not read the workflow inputs.
A condition such as `$inputs.flag == true` was always false, so the action never ran.
