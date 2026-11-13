---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` reported `unexpected error` instead of `global timeout error` for a workflow when the execution timeout stopped a workflow from its `dependsOn` list.
