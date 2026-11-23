---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect failed a step that calls a workflow with `workflowId` when the `outputs` of the step read `$inputs`, `$steps`, or `$workflows`, as in a Selector Object with `{$inputs.name}` in its `selector`.
