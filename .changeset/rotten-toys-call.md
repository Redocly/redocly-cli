---
'@redocly/cli': patch
---

Fixed an issue where telemetry recorded a mangled command line when an option value was empty or a single character.
Telemetry no longer records the `push` commit author.
