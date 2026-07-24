---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed `respect` to stop parent workflow execution when a step that references another workflow fails. Previously, the next steps of the parent workflow were still executed after the referenced workflow failed.
