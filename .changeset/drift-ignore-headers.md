---
'@redocly/cli': minor
---

Added an `--ignore-headers` option to the experimental `drift` and `proxy` commands. It takes a comma-separated list of header names to skip in undocumented-header checks, and a trailing `*` matches by prefix (for example `x-consumer-*`). Use it to silence headers a gateway or proxy adds that are not part of the API contract.
