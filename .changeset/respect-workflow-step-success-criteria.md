---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect skipped the `successCriteria` of a step that calls a workflow with `workflowId`.
Respect now checks them against the outputs of the called workflow, read as `$outputs`, and a failed criterion fails the step and runs its `onFailure` actions.
