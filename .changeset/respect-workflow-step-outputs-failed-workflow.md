---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect reported an extra `unexpected error` for a step that calls a workflow with `workflowId` when the called workflow failed and left a value that the `outputs` of the step read unset.
