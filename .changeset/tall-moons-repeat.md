---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed `respect` clearing step outputs when a `goto` action transfers control to a step in the same workflow, which made `$steps` expressions in the target step fail to resolve.
