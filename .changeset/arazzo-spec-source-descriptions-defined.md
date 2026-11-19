---
'@redocly/openapi-core': minor
'@redocly/cli': minor
'@redocly/respect-core': minor
---

Added the `spec-sourceDescriptions-defined` rule for Arazzo descriptions.
The rule reports a `$sourceDescriptions.<name>` reference in the `operationPath`, `channelPath`, `workflowId`, or `dependsOn` of a step, or in the `workflowId` of a success or failure action, when no source description with that name is defined.
