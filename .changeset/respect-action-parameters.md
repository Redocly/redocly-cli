---
'@redocly/cli': minor
'@redocly/respect-core': minor
---

Added support for the `parameters` field of Arazzo 1.1.0 success and failure actions to the `respect` command.
When an action references a workflow with `workflowId`, `respect` passes the action's parameters to that workflow as inputs.
