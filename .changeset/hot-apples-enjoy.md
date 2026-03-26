---
"@redocly/openapi-core": patch
---

Fixed a crash when a non-string value (for example, a number) was used in an `extends` array in `redocly.yaml` inside `scorecard`/`scorecardClassic`.
Fixed a crash when reference could not be resolved in `extends`.
