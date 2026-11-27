---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect failed with the `Maximum call stack size exceeded` error when a workflow `inputs` schema was recursive.
