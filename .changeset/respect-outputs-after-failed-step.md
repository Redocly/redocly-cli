---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` reported an unresolved workflow output instead of the failed step that caused it, and stopped the other workflows of the file.
