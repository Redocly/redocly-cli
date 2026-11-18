---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect failed a step when its `end` action had a `workflowId` that did not reference an existing workflow.
The `workflowId` and the `stepId` of an `end` action are not relevant, so Respect no longer resolves them.
