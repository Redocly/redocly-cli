---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `operation-4xx-problem-details-rfc7807` rule incorrectly reported the `type` and `title` properties inherited through `allOf` as missing.
