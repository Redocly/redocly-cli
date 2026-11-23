---
'@redocly/respect-core': patch
'@redocly/cli': patch
---

Fixed an issue where Respect failed a step that calls a workflow with `workflowId` when the step's `outputs` used `$inputs`, `$steps`, or `$workflows`.
The expressions also work in the `selector` of a Selector Object, for example `{$inputs.name}`.
