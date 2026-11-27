---
'@redocly/openapi-core': minor
'@redocly/respect-core': minor
'@redocly/cli': minor
---

Added the `no-step-requestBody-with-workflowId` rule for Arazzo descriptions.
It reports the `requestBody` of a step that uses `workflowId`, because a request body is only passed to an operation.
