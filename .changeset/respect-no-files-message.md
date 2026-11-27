---
'@redocly/cli': patch
---

Fixed an issue where the `respect` command failed with `Invalid count value: -Infinity` when it was run without a file, instead of saying that a file is required.
