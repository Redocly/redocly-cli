---
'@redocly/openapi-core': minor
'@redocly/cli': minor
'@redocly/respect-core': minor
---

Added the `spec-no-invalid-runtime-expressions` rule for Arazzo descriptions.
It reports an invalid runtime expression in the `outputs` of a workflow or a step, in the `context` of a criterion or a selector, in the `reference` of a reusable object, and in the `operationPath` or the `channelPath` of a step.
