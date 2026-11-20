---
'@redocly/openapi-core': minor
'@redocly/respect-core': minor
'@redocly/cli': minor
---

Added the `spec-step-parameters-in-required` rule for Arazzo descriptions.
It reports a step or workflow parameter without the `in` field, unless it only reaches steps that use `workflowId`.
