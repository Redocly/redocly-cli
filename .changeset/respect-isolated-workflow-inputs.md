---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `respect` command kept the inputs that a step passed to a workflow in the same file.
Later runs of that workflow used them instead of their `--input` values or schema defaults.
