---
'@redocly/openapi-core': patch
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed the `outputs-defined` rule for Arazzo descriptions so `$steps` expressions are checked against the steps of their own workflow.
Two workflows can now use the same `stepId` without false errors.
