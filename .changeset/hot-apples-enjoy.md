---
"@redocly/openapi-core": patch
---

Fixed a crash when a non-string value (e.g. a number) was used in an `extends` array at the root level or inside `scorecard`/`scorecardClassic` levels. A clear error is now thrown instead.
