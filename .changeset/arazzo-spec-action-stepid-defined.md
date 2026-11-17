---
'@redocly/openapi-core': minor
'@redocly/respect-core': minor
'@redocly/cli': minor
---

Added the `spec-action-stepId-defined` rule for Arazzo descriptions.
It reports a success or failure action whose `stepId` does not reference a step of the current workflow.

**Note:** The rule is an error in the `recommended`, `recommended-strict`, and `spec` rulesets, so a description with such an action now fails `lint` and stops a Respect run.
Point the `stepId` to a step of the same workflow, or use `workflowId` to transfer to another workflow.
