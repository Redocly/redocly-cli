---
'@redocly/openapi-core': patch
'@redocly/cli': patch
---

Fixed the `struct` rule to report `parameters` on Arazzo 1.1 success and failure actions that don't have a `workflowId`, such as a `goto` to a `stepId`.
Action parameters are passed to the workflow that `workflowId` references, so they have no effect without it.
**Note:** descriptions with such actions now fail `lint`, and `respect` doesn't run them.
