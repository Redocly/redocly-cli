---
'@redocly/cli': patch
'@redocly/respect-core': patch
---

Fixed an issue where `respect` didn't retry a step when its `retry` action had no `retryLimit`.
As the Arazzo specification defines, such an action now retries the step once, after running the workflow or step that the action references.
A `retry` action that targets a `stepId` also no longer retries without limit when that step has its own `retry` action.
