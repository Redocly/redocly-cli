---
'@redocly/cli': patch
---

Fixed an issue where `respect --har-output` recorded an empty `postData` for every request.
Request bodies are written to the HAR.
Captures replayed through `drift` can have their request bodies validated instead of silently passing.
