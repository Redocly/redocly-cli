---
'@redocly/cli': minor
---

Deprecated running the `stats`, `score`, and `scorecard-classic` commands without an API, which takes the first API of the configuration file.
A later release requires the API, so pass it to the command, for example `redocly stats <api>`.
