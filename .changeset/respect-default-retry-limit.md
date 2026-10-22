---
'@redocly/cli': patch
'@redocly/respect-core': patch
---

Fixed an issue where `respect` didn't retry a step when its `retry` failure action had no `retryLimit`.

**Note:** Previously, a workflow continued with the next step after a step had failed and used up its retries.
