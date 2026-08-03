---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed the `operation-4xx-problem-details-rfc7807` rule to resolve `$ref`s and composed schemas, so the `type` and `title` properties inherited through `allOf` are no longer reported as missing.

**Note**: the rule now also reports problem schemas that define no properties at all, which previously escaped the check.
