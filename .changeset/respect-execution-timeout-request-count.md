---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where `respect` counted and listed a request twice in the JSON output when the execution timeout ended the retries of a step.
