---
"@redocly/openapi-core": patch
---

Fixed a crash when a non-string value (for example, a number) was used in an `extends` array  in `redocly.yaml` at the root level or inside `scorecard`/`scorecardClassic`.
Improved error message.
Improved error when plugin is not exists.
