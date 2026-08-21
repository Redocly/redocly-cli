---
'@redocly/cli': patch
---

Fixed `respect --har-output` recording an empty `postData` for every request. Request bodies are now written to the HAR, so a capture replayed through `drift` can have its request bodies validated instead of silently passing.
