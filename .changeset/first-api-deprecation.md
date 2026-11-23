---
'@redocly/cli': minor
---

Deprecated running the `build-docs`, `stats`, `score`, and `scorecard-classic` commands without the `api` argument.
Without the argument, these commands process the first API in `redocly.yaml` and display a deprecation banner.
To prepare for a later release that requires the argument, pass an API alias or path, for example `redocly build-docs <api>`.
