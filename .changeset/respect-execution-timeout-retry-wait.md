---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` waited for a retry or ran a sub-workflow step after the execution timeout, and reported `globalTimeoutError: false` in the JSON output when the timeout ended a retry.
