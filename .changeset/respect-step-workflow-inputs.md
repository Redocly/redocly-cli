---
'@redocly/cli': patch
'@redocly/respect-core': patch
---

Fixed an issue where `respect` kept the inputs that a step passed to a workflow with `parameters` for later runs of that workflow.
The parameter values now use the same runtime expressions as operation parameters, including JSON pointers such as `$steps.login.outputs.user#/id`.
**Note:** a parameter that references a missing value, such as `$inputs.unknown`, now passes no value to the workflow input instead of failing the step.
