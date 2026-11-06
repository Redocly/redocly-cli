---
'@redocly/cli': minor
---

Added a notice to `respect` for Arazzo descriptions with an AsyncAPI source description.
The command does not support them yet, so it now stops before running any workflow instead of failing every step that uses that source.
