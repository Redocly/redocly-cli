---
'@redocly/openapi-core': minor
'@redocly/cli': minor
'@redocly/respect-core': minor
---

Added the `spec-no-invalid-runtime-expressions` rule for Arazzo descriptions.
It reports a value in the `outputs` of a workflow or a step, in the `context` of a criterion or a selector, or in the `reference` of a reusable object that does not follow the runtime expression syntax of the Arazzo specification.
It also reports an invalid expression embedded in the `operationPath` or the `channelPath` of a step.
