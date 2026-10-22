---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed an issue where the `struct` rule didn't report Arazzo 1.1.0 success and failure actions that had `parameters` without a `workflowId`, or action parameters with an `in` field.
Action parameters are passed as inputs to the target workflow, so they require a `workflowId` and can't have an `in` field.
Existing Arazzo descriptions with these actions fail `lint`, and `respect` doesn't run them.
