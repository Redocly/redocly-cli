---
'@redocly/cli': patch
'@redocly/respect-core': patch
---

Fixed an issue where `respect` skipped a `retry` failure action after an earlier `retry` action of the same step had used up its retries.
