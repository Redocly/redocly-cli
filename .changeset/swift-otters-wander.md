---
'@redocly/openapi-core': minor
'@redocly/cli': minor
---

Added the `spec-parameters-in-by-context` Arazzo rule, which validates that a parameter's `in` field is specified when the parent workflow, step, success action, or failure action does not reference a `workflowId`.
