---
'@redocly/cli': minor
'@redocly/respect-core': minor
---

Added support for the Arazzo 1.1.0 `parameters` field of success and failure actions to the `respect` command.
When an action references a workflow with `workflowId`, its parameters are passed to that workflow as inputs.
