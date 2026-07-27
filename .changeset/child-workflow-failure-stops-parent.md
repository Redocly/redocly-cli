---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue in `respect` where the execution of parent workflow's steps didn't halt after a step that referenced another workflow had failed.
