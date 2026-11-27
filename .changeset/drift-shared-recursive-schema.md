---
'@redocly/cli': patch
---

Fixed an issue where the `drift` and `proxy` commands skipped an OpenAPI description with the `Maximum call stack size exceeded` warning when it shared a file with a recursive schema with another description in the same folder.
