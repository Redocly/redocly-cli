---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where a `jsonpath` success criterion did not match when its condition had a runtime expression inside quotes, as in `$[?(@.status == "{$inputs.expectedStatus}")]`.
